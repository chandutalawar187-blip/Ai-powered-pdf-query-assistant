# server/app.py (FINAL COMPLETE BACKEND CODE)

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pypdf
from google import genai
from google.genai.errors import APIError
import fitz  # PyMuPDF for image extraction
import re  # For regular expressions to find question numbers
import tempfile
import traceback  # NEW: For detailed error logging
import base64

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# Global state
client = None
notes_pdf_path = None  # Path to the Notes file (Primary source for image extraction)
paper_pdf_path = None
document_text_chunks = []
query_history = []  # Active Learning: Stores the conversation history (Q/A)

try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")


# --- IMAGE EXTRACTION HELPER ---

def extract_and_crop_image(pdf_path, page_number):
    """
    Renders the entire page where a figure is cited and returns it as a Base64 PNG.
    This ensures the full figure is displayed, bypassing complex bounding box math.
    """
    if not os.path.exists(pdf_path):
        # Critical Debug Log if path is lost
        print(f"CRITICAL IMAGE DEBUG: PDF path not found at {pdf_path}")
        return None

    doc = None
    try:
        # Load the PDF into memory using PyMuPDF
        doc = fitz.open(pdf_path)
        # Page numbers in PyMuPDF are 0-indexed
        page = doc[page_number - 1]

        # Render the ENTIRE page at 200% zoom (2x DPI)
        zoom_matrix = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=zoom_matrix)

        # Get bytes in memory and encode
        img_bytes = pix.tobytes(output="png")
        base64_img = base64.b64encode(img_bytes).decode('utf-8')

        return f"data:image/png;base64,{base64_img}"

    finally:
        # Close the document explicitly

            doc.close()


# --- CORE PDF PROCESSING ---

def extract_text_and_chunk(pdf_path, is_notes_file=True):
    """Extracts text and chunks, labeling them by source type (Notes/Paper)."""

    global document_text_chunks, query_history

    source_label = "[NOTES]" if is_notes_file else "[PAPER]"
    new_chunks = []

    try:
        reader = pypdf.PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            page_number = i + 1

            chunk_size = 1000
            for j in range(0, len(text), chunk_size):
                chunk = text[j:j + chunk_size]
                # Label the chunk with its source: [NOTES] or [PAPER]
                new_chunks.append(f"{source_label} [Page {page_number}] {chunk}")

        # Clear existing chunks if uploading the primary source (Notes)
        if is_notes_file:
            document_text_chunks.clear()
            query_history.clear()  # Clear history on new Notes upload

        # Add new chunks to the global context
        document_text_chunks.extend(new_chunks)
        return True, len(new_chunks)
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return False, 0


# --- QUESTION PAPER HELPER ---

def get_question_text_from_paper(question_number):
    """
    Attempts to find the text for a given question number (e.g., 'Q1') in the Question Paper PDF.
    """
    if not paper_pdf_path:
        return None

    try:
        # 1. Parse the desired question number (e.g., Q1 -> 1)
        num = re.search(r'\d+', question_number).group()

        # 2. Get all text from the Question Paper (not just chunks)
        paper_text = ""
        reader = pypdf.PdfReader(paper_pdf_path)
        for page in reader.pages:
            paper_text += page.extract_text() + "\n"

        # 3. Use regex to find the question text following the number
        # Pattern looks for: (Q or Question + Num + Punctuation) followed by (Question Text)
        pattern = re.compile(r'(?:Q|Question)?\s*' + re.escape(
            num) + r'[\.\)\s]+(.*?)(?=\s*(?:Q|Question)?\s*\d+[\.\)\s]+|option\s+[a-z]|\Z)', re.DOTALL | re.IGNORECASE)
        match = pattern.search(paper_text)

        if match:
            q_text = match.group(1).strip()
            # Final cleaning: remove any trailing option letters or short punctuation
            q_text = re.sub(r'\s+[a-z][\.\)]?\s*$', '', q_text, flags=re.IGNORECASE).strip()

            if q_text and len(q_text) > 5:
                return q_text

        return None

    except Exception as e:
        print(f"ERROR reading question paper: {e}")
        return None


# --- API ENDPOINTS ---

@app.route('/upload-notes', methods=['POST'])
def upload_notes_pdf():
    """Endpoint for uploading the primary source (Notes)."""
    global notes_pdf_path
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']

    # Save the file
    temp_dir = tempfile.gettempdir()
    current_notes_path = os.path.join(temp_dir, f"notes_{os.getpid()}_{pdf_file.filename}")
    notes_pdf_path = current_notes_path

    pdf_file.save(current_notes_path)

    # Process and clear existing index before adding new notes
    success, count = extract_text_and_chunk(current_notes_path, is_notes_file=True)

    if success:
        return jsonify({
            "message": f"Notes processed successfully. {count} chunks indexed.",
            "chunks_count": count
        })
    else:
        return jsonify({"error": "Failed to process Notes PDF."}), 500


@app.route('/upload-paper', methods=['POST'])
def upload_paper_pdf():
    """Endpoint for uploading the secondary source (Question Paper)."""
    global paper_pdf_path
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']

    # Save the file
    temp_dir = tempfile.gettempdir()
    current_paper_path = os.path.join(temp_dir, f"paper_{os.getpid()}_{pdf_file.filename}")
    paper_pdf_path = current_paper_path

    pdf_file.save(current_paper_path)

    # Process and add to global index. Note: is_notes_file=False
    success, count = extract_text_and_chunk(current_paper_path, is_notes_file=False)

    if success:
        return jsonify({
            "message": f"Question Paper processed successfully. {count} chunks indexed.",
            "chunks_count": count
        })
    else:
        return jsonify({"error": "Failed to process Question Paper PDF."}), 500


@app.route('/query', methods=['POST'])
def handle_query():
    """Dynamically handles Full Text, Verbatim QA, or COMPARISON extraction."""
    global query_history, notes_pdf_path

    if not client:
        return jsonify({"error": "AI client is not initialized. Check API Key."}), 500

    data = request.json
    question = data.get('question', '').strip()

    if not document_text_chunks:
        return jsonify({"error": "Please upload at least one PDF first."}), 400

    lower_q = question.lower()

    # --- STEP 1: CHECK FOR QUESTION NUMBER COMMAND (QUERY REWRITE) ---

    # Look for patterns like 'Q1', 'Question 5', 'question number one'
    q_num_match = re.search(r'(q\s*\d+|\s*question\s*\d+|\s*#\s*\d+)', lower_q)

    if q_num_match and paper_pdf_path:
        q_num_str = q_num_match.group().strip()
        extracted_q_text = get_question_text_from_paper(q_num_str)

        if extracted_q_text:
            # REWRITE the user's query to use the extracted question text
            original_q = question
            question = extracted_q_text
            lower_q = question.lower()
            print(f"QUERY REWRITE: Original: '{original_q}' -> New: '{question}'")

    # --- PREPARE HISTORY CONTEXT ---
    history_context = "\n".join(query_history[-5:])  # Use last 5 interactions for context
    if history_context:
        history_context = "--- Conversation History ---\n" + history_context + "\n------------------------------\n"
    else:
        history_context = ""

    # --- MODE 1: FULL TEXT EXTRACTION (Bypass LLM) ---
    full_text_keywords = ['explain all the pdf', 'give me the content', 'show all content', 'extract all text']
    if any(keyword in lower_q for keyword in full_text_keywords):
        full_text = "\n\n".join(document_text_chunks)
        return jsonify({
            "answer": full_text,
            "sources": f"Complete content extracted from ALL uploaded files ({len(document_text_chunks)} chunks).",
            "mode": "FULL_TEXT"
        })

    # --- MODE 2: COMPARISON DETECTION ---
    comparison_keywords = ['compare', 'difference', 'differentiate', 'distinguish']
    is_comparison_request = any(keyword in lower_q for keyword in comparison_keywords)

    if is_comparison_request:
        mode = "COMPARISON"
        # Increase retrieval size for comparison
        keywords = lower_q.replace('compare', '').replace('difference', '').replace('differentiate', '').replace(
            'between', '').split()

        relevant_chunks = [
            chunk for chunk in document_text_chunks
            if any(kw in chunk.lower() for kw in keywords)
        ][:30]  # Retrieve up to 30 chunks for a deep comparison

        context = "\n---\n".join(relevant_chunks)

        # Extract all unique page numbers found in the retrieved context
        retrieved_pages = sorted(list(set([
            # Extract the page number from the [Page X] tag
            int(chunk.split('[Page ')[1].split(']')[0])
            for chunk in relevant_chunks if '[Page ' in chunk
        ])))
        page_ref_string = f" (Sources: Pages {', '.join(map(str, retrieved_pages))})"

        mode_info = f"Comparison Mode"

        # Instruction to force Markdown Table Output
        system_instruction = (
            "You are an expert academic analyst. Your task is to extract comparison points for the concepts in the user's question, using ONLY the CONTEXT provided.\n\n"
            "RULES:\n"
            "1. **OUTPUT FORMAT:** The entire output MUST be a single Markdown table.\n"
            "2. **TABLE STRUCTURE:** The table MUST have three columns: 'Parameter', 'Concept 1 Value', and 'Concept 2 Value'.\n"
            "3. **CONTENT:** Extract specific differentiating parameters (e.g., Cost, Speed, Architecture) and fill in the values for the two concepts being compared.\n"
            "4. **CITATION:** Append the citation string at the very end of the markdown table.\n"
            "5. **NO INTRO/CLOSING:** Do NOT include any introductory or explanatory text outside the table and the citation.\n"
            f"6. **FAILURE:** If information for a clear comparison table is not in the context, reply with the exact phrase: 'Insufficient data for a comparison table was found in the document.'"
        )

        # Append the citation string to the prompt so the model is forced to include it.
        prompt = f"User Question: {question}\n\nCONTEXT:\n{context}\n\nCITATION STRING TO APPEND: {page_ref_string}"


    else:
        # --- MODE 3: HYPER-VERBATIM EXTRACTION (DEFAULT RAG) ---
        mode = "VERBATIM"

        # --- MODIFIED UNIVERSAL RETRIEVAL LOGIC ---

        # 1. Universal Cleaning: Remove instructional fluff words only
        fluff_words = [
            'name the', 'broad categories of', 'explain them briefly', 'the four', 'and', 'for',
            'marks', 'briefly', 'neat diagram', 'with a', 'explain the', 'following the', 'model',
            'hosts', 'communication', 'what is', 'what are', 'please explain', 'describe',
            'definition', 'type of', 'in detail'
        ]

        cleaned_query_parts = lower_q.split()
        final_keywords = []
        for word in cleaned_query_parts:
            if word not in fluff_words and len(word) > 2:
                final_keywords.append(word)

        # Use the keywords from the question directly
        keywords = final_keywords

        relevant_chunks = [
            chunk for chunk in document_text_chunks
            if any(kw in chunk.lower() for kw in keywords)
        ][:25]  # Retrieving up to 25 chunks for complex answers

        context = "\n---\n".join(relevant_chunks)
        mode_info = f"Verbatim Extraction Mode (Using {len(relevant_chunks)} chunks)"

        # --- HYPER-STRICT EXTRACTION INSTRUCTION (Universal for Lists/Explanations) ---
        system_instruction = (
            "You are a MUTE, Document-Bound Extraction Specialist. Your ONLY source of knowledge is the CONTEXT. "
            "Use the CONTEXT and the optional CONVERSATION HISTORY below to fully answer the user's question, especially if it involves a list, explanation, or a reference to a diagram.\n"
            "RULES:\n"
            "1. **MUST BE VERBATIM:** The entire output MUST be copied EXACTLY from the CONTEXT. Do not reword or add any summary/commentary.\n"
            "2. **OUTPUT FORMAT:** The response MUST be a VERBATIM, fully-quoted response. Return all sentences/paragraphs necessary to provide the full explanation.\n"
            "3. **CITATION:** The entire response MUST be the exact quote(s) followed by the citation [Page X]. If the answer spans multiple chunks/pages, include all relevant citations.\n"
            "4. **IMAGE HINT (CRITICAL):** If the answer explicitly references a figure or if the question asks for a 'diagram,' your output must ALSO include the reference [FIG:Page X] at the end, using the page number where the diagram/figure is found in the context.\n"
            "5. **FAILURE:** If the answer is not in the context, reply with the exact phrase: 'The required information was not found in the uploaded document.'"
        )
        # Use standard prompt
        prompt = f"CONVERSATION HISTORY: {history_context} \nUser Question: {question}\n\nCONTEXT:\n{context}"

    # --- 5. EXECUTE GEMINI QUERY ---
    image_data = None

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"system_instruction": system_instruction}
        )
        answer_text = response.text

        # --- SUCCESS: UPDATE HISTORY ---
        query_history.append(f"Q: {question}")
        query_history.append(f"A: {answer_text[:50]}...")  # Store short version of answer

        # --- IMAGE DETECTION AND EXTRACTION (Only for VERBATIM mode) ---
        if mode == "VERBATIM" and "[FIG:" in answer_text and notes_pdf_path:
            try:
                page_match = answer_text.split('[FIG:Page ')[1].split(']')[0]
                # Ensure the extracted page number is an integer
                page_num = int(''.join(filter(str.isdigit, page_match)))

                # Assume image is in NOTES PDF as the primary source for figures
                image_data = extract_and_crop_image(notes_pdf_path, page_num)
            except Exception as e:
                print(f"IMAGE PROCESSING/EXTRACTION ERROR: {e}")

        # Successful response
        return jsonify({
            "answer": answer_text,
            "sources": mode_info,
            "mode": mode,
            "image_data": image_data
        })

    except APIError as e:
        user_facing_error = f"API FAILED (QUOTA/KEY): {str(e)[:100]}..."
        return jsonify({"error": user_facing_error}), 500
    except Exception as e:
        user_facing_error = f"SERVER CRASHED: Unhandled Python Error ({e.__class__.__name__})."
        return jsonify({"error": user_facing_error}), 500


if __name__ == '__main__':
    # --- LOCAL DEVELOPMENT BINDING ---
    # Running locally for testing purposes.
    # We use 127.0.0.1 (localhost) and enable debug mode.
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
