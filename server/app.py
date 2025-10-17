# server/app.py (FINAL COMPLETE BACKEND CODE WITH OCR MODE)

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
import traceback
import base64
from io import BytesIO  # Added for in-memory image handling

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# Global state
client = None
notes_pdf_path = None
paper_pdf_path = None
document_text_chunks = []
query_history = []

try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")


# --- IMAGE EXTRACTION HELPER (Used for display only) ---

def extract_and_crop_image(pdf_path, page_number):
    """Renders the entire page where a figure is cited and returns it as a Base64 PNG."""
    if not os.path.exists(pdf_path):
        print(f"CRITICAL IMAGE DEBUG: PDF path not found at {pdf_path}")
        return None

    doc = None
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_number - 1]
        zoom_matrix = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=zoom_matrix)
        img_bytes = pix.tobytes(output="png")
        base64_img = base64.b64encode(img_bytes).decode('utf-8')
        return f"data:image/png;base64,{base64_img}"
    except Exception as e:
        print(f"IMAGE EXTRACTION FAILED on page {page_number}. Error: {e}")
        traceback.print_exc()
        return None
    finally:
        if doc and not doc.is_closed:
            doc.close()


# --- CORE PDF PROCESSING (Updated for OCR) ---

def perform_ocr_on_page(pdf_path, page_index):
    """Renders a PDF page to an image and uses Gemini Vision for OCR."""
    doc = None
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_index]

        # Render page at 300 DPI for high-quality OCR
        zoom_matrix = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=zoom_matrix)

        # Convert image to PNG bytes in memory
        img_bytes = pix.tobytes(output="png")
        base64_img = base64.b64encode(img_bytes).decode('utf-8')

        # Multimodal prompt for OCR
        prompt_parts = [
            genai.types.Part.from_bytes(data=img_bytes, mime_type='image/png'),
            "Perform OCR on this image. Extract all text accurately, preserving newlines and spacing."
        ]

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_parts,
            config={"system_instruction": "You are an expert OCR engine. Output only the extracted text."}
        )
        return response.text if response.text else ""

    except Exception as e:
        print(f"GEMINI OCR FAILED on page {page_index + 1}: {e}")
        return ""
    finally:
        if doc and not doc.is_closed:
            doc.close()


def extract_text_and_chunk(pdf_path, is_notes_file=True):
    """Extracts text and chunks, using OCR fallback for sparse documents."""

    global document_text_chunks, query_history
    source_label = "[NOTES]" if is_notes_file else "[PAPER]"
    new_chunks = []

    # 1. Clear previous state
    if is_notes_file:
        document_text_chunks.clear()
        query_history.clear()

    try:
        reader = pypdf.PdfReader(pdf_path)
        num_pages = len(reader.pages)

        for i in range(num_pages):
            page = reader.pages[i]
            # Attempt native text extraction first
            text = page.extract_text()
            page_number = i + 1

            # Heuristic Check for Handwritten/Scanned PDF (if text is too short)
            if len(text) < 100 and num_pages > 1:
                print(f"ATTEMPTING OCR on Page {page_number} (Sparse text detected)")
                text = perform_ocr_on_page(pdf_path, i)  # Run Gemini OCR

            # --- Chunking based on retrieved text (OCR or Native) ---
            chunk_size = 1000
            if not text:
                text = f"[NO READABLE TEXT ON PAGE {page_number}]"

            for j in range(0, len(text), chunk_size):
                chunk = text[j:j + chunk_size]
                new_chunks.append(f"{source_label} [Page {page_number}] {chunk}")

        document_text_chunks.extend(new_chunks)
        return True, len(new_chunks)
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return False, 0


# --- QUESTION PAPER HELPER (Same as before) ---
def get_question_text_from_paper(question_number):
    if not paper_pdf_path:
        return None

    try:
        num = re.search(r'\d+', question_number).group()
        paper_text = ""
        reader = pypdf.PdfReader(paper_pdf_path)
        for page in reader.pages:
            paper_text += page.extract_text() + "\n"

        pattern = re.compile(r'(?:Q|Question)?\s*' + re.escape(
            num) + r'[\.\)\s]+(.*?)(?=\s*(?:Q|Question)?\s*\d+[\.\)\s]+|option\s+[a-z]|\Z)', re.DOTALL | re.IGNORECASE)
        match = pattern.search(paper_text)

        if match:
            q_text = match.group(1).strip()
            q_text = re.sub(r'\s+[a-z][\.\)]?\s*$', '', q_text, flags=re.IGNORECASE).strip()

            if q_text and len(q_text) > 5:
                return q_text

        return None

    except Exception as e:
        print(f"ERROR reading question paper: {e}")
        return None


# --- API ENDPOINTS (Dual Uploads) ---
@app.route('/upload-notes', methods=['POST'])
def upload_notes_pdf():
    """Endpoint for uploading the primary source (Notes)."""
    global notes_pdf_path
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']

    temp_dir = tempfile.gettempdir()
    current_notes_path = os.path.join(temp_dir, f"notes_{os.getpid()}_{pdf_file.filename}")
    notes_pdf_path = current_notes_path
    pdf_file.save(current_notes_path)

    success, count = extract_text_and_chunk(current_notes_path, is_notes_file=True)
    if success:
        return jsonify({"message": f"Notes processed successfully. {count} chunks indexed.", "chunks_count": count})
    else:
        return jsonify({"error": "Failed to process Notes PDF."}), 500


@app.route('/upload-paper', methods=['POST'])
def upload_paper_pdf():
    """Endpoint for uploading the secondary source (Question Paper)."""
    global paper_pdf_path
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']

    temp_dir = tempfile.gettempdir()
    current_paper_path = os.path.join(temp_dir, f"paper_{os.getpid()}_{pdf_file.filename}")
    paper_pdf_path = current_paper_path
    pdf_file.save(current_paper_path)

    success, count = extract_text_and_chunk(current_paper_path, is_notes_file=False)
    if success:
        return jsonify(
            {"message": f"Question Paper processed successfully. {count} chunks indexed.", "chunks_count": count})
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

    # --- STEP 1: QUERY REWRITE (Question Number Logic) ---
    q_num_match = re.search(r'(q\s*\d+|\s*question\s*\d+|\s*#\s*\d+)', lower_q)

    if q_num_match and paper_pdf_path:
        q_num_str = q_num_match.group().strip()
        extracted_q_text = get_question_text_from_paper(q_num_str)

        if extracted_q_text:
            question = extracted_q_text
            lower_q = question.lower()

    # --- PREPARE HISTORY CONTEXT ---
    history_context = "\n".join(query_history[-5:])
    if history_context:
        history_context = "--- Conversation History ---\n" + history_context + "\n------------------------------\n"
    else:
        history_context = ""

    # --- MODE 1: FULL TEXT EXTRACTION (Bypass LLM) ---
    full_text_keywords = ['explain all the pdf', 'give me the content', 'show all content', 'extract all text']
    if any(keyword in lower_q for keyword in full_text_keywords):
        full_text = "\n\n".join(document_text_chunks)
        return jsonify({"answer": full_text,
                        "sources": f"Complete content extracted from ALL uploaded files ({len(document_text_chunks)} chunks).",
                        "mode": "FULL_TEXT"})

    # --- MODE 2: COMPARISON DETECTION ---
    comparison_keywords = ['compare', 'difference', 'differentiate', 'distinguish']
    is_comparison_request = any(keyword in lower_q for keyword in comparison_keywords)

    if is_comparison_request:
        mode = "COMPARISON"
        keywords = lower_q.replace('compare', '').replace('difference', '').replace('differentiate', '').replace(
            'between', '').split()
        relevant_chunks = [chunk for chunk in document_text_chunks if any(kw in chunk.lower() for kw in keywords)][:30]
        context = "\n---\n".join(relevant_chunks)

        retrieved_pages = sorted(
            list(set([int(chunk.split('[Page ')[1].split(']')[0]) for chunk in relevant_chunks if '[Page ' in chunk])))
        page_ref_string = f" (Sources: Pages {', '.join(map(str, retrieved_pages))})"
        mode_info = f"Comparison Mode"

        system_instruction = (
            "You are an expert academic analyst. Your task is to extract comparison points for the concepts in the user's question, using ONLY the CONTEXT provided.\n\nRULES:\n1. **OUTPUT FORMAT:** The entire output MUST be a single Markdown table.\n2. **TABLE STRUCTURE:** The table MUST have three columns: 'Parameter', 'Concept 1 Value', and 'Concept 2 Value'.\n3. **CONTENT:** Extract specific differentiating parameters (e.g., Cost, Speed, Architecture) and fill in the values for the two concepts being compared.\n4. **CITATION:** Append the citation string at the very end of the markdown table.\n5. **NO INTRO/CLOSING:** Do NOT include any introductory or explanatory text outside the table and the citation.\n6. **FAILURE:** If information for a clear comparison table is not in the context, reply with the exact phrase: 'Insufficient data for a comparison table was found in the document.'")

        prompt = f"User Question: {question}\n\nCONTEXT:\n{context}\n\nCITATION STRING TO APPEND: {page_ref_string}"


    else:
        # --- MODE 3: HYPER-VERBATIM EXTRACTION (DEFAULT RAG) ---
        mode = "VERBATIM"

        # 1. Universal Cleaning: Remove instructional fluff words only
        fluff_words = ['name the', 'broad categories of', 'explain them briefly', 'the four', 'and', 'for', 'marks',
                       'briefly', 'neat diagram', 'with a', 'explain the', 'following the', 'model', 'hosts',
                       'communication', 'what is', 'what are', 'please explain', 'describe', 'definition', 'type of',
                       'in detail']
        cleaned_query_parts = lower_q.split()
        final_keywords = [word for word in cleaned_query_parts if word not in fluff_words and len(word) > 2]
        keywords = final_keywords

        relevant_chunks = [chunk for chunk in document_text_chunks if any(kw in chunk.lower() for kw in keywords)][:25]
        context = "\n---\n".join(relevant_chunks)
        mode_info = f"Verbatim Extraction Mode (Using {len(relevant_chunks)} chunks)"

        # --- HYPER-STRICT EXTRACTION INSTRUCTION (Final Multi-Sentence Fix) ---
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
        query_history.append(f"A: {answer_text[:50]}...")

        # --- IMAGE DETECTION AND EXTRACTION (Only for VERBATIM mode) ---
        if mode == "VERBATIM" and "[FIG:" in answer_text and notes_pdf_path:
            try:
                page_match = answer_text.split('[FIG:Page ')[1].split(']')[0]
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
    # --- PRODUCTION-READY BINDING ---
    # Retrieve the PORT set by the host (Render) and bind to 0.0.0.0 (all interfaces)
    # This is the correct binding for a public server.

    # 1. Get the port number provided by the environment, defaulting to 5000 if local
    port = int(os.environ.get("PORT", 5000))

    # 2. Run the application using the dynamic port and host set to 0.0.0.0
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
