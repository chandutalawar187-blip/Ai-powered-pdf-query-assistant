# server/app.py (FINAL COMPLETE BACKEND CODE WITH CONVERSATIONAL HISTORY)

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pypdf
from google import genai
from google.genai.errors import APIError
import fitz  # PyMuPDF for image extraction
import io
from PIL import Image
import base64
import tempfile

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# Global state
client = None
uploaded_pdf_path = None
document_text_chunks = []
document_pages = {}
query_history = []  # <--- ACTIVE LEARNING: Global list to store conversation history

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
    try:
        doc = fitz.open(pdf_path)
        # Page numbers in PyMuPDF are 0-indexed
        page = doc[page_number - 1]

        # Render the ENTIRE page at 200% zoom (2x DPI)
        zoom_matrix = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=zoom_matrix)

        img_bytes = pix.tobytes(output="png")

        base64_img = base64.b64encode(img_bytes).decode('utf-8')

        return f"data:image/png;base64,{base64_img}"

    except Exception as e:
        print(f"IMAGE EXTRACTION FAILED on page {page_number}: {e}")
        return None
    finally:
        # Close the document explicitly
        if 'doc' in locals() and not doc.is_closed:
            doc.close()


# --- CORE PDF PROCESSING ---

def extract_text_and_chunk(pdf_path):
    """Extracts text and chunks, storing page number metadata."""
    global document_text_chunks, document_pages, query_history
    document_text_chunks.clear()
    document_pages.clear()
    query_history.clear()  # Clear history on new PDF upload

    try:
        reader = pypdf.PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            page_number = i + 1
            document_pages[page_number] = text

            chunk_size = 1000
            for j in range(0, len(text), chunk_size):
                chunk = text[j:j + chunk_size]
                document_text_chunks.append(f"[Page {page_number}] {chunk}")
        return True
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return False


# --- API ENDPOINTS ---

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Handles file upload, saves it for image extraction, and processes text."""
    global uploaded_pdf_path
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400

    pdf_file = request.files['pdf']

    # Save the file to a known temporary location for PyMuPDF access later
    temp_dir = tempfile.gettempdir()
    # Use a unique name to avoid conflicts if the same file is uploaded multiple times
    uploaded_pdf_path = os.path.join(temp_dir, f"uploaded_{os.getpid()}_{pdf_file.filename}")

    pdf_file.save(uploaded_pdf_path)

    if extract_text_and_chunk(uploaded_pdf_path):
        return jsonify({
            "message": f"PDF processed successfully. {len(document_text_chunks)} chunks indexed.",
            "chunks_count": len(document_text_chunks)
        })
    else:
        return jsonify({"error": "Failed to process PDF."}), 500


@app.route('/query', methods=['POST'])
def handle_query():
    """Dynamically handles Full Text, Verbatim QA, or COMPARISON extraction."""
    global query_history  # Access global history list

    if not client:
        return jsonify({"error": "AI client is not initialized. Check API Key."}), 500

    data = request.json
    question = data.get('question', '').strip()

    if not document_text_chunks:
        return jsonify({"error": "Please upload a PDF first."}), 400

    lower_q = question.lower()

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
            "sources": "Complete content extracted from ALL pages.",
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
            # Check if the word is NOT a fluff word
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
            "2. **OUTPUT FORMAT:** The response MUST include all relevant category names and their definitions/explanations as found in the text.\n"
            "3. **CITATION:** The entire response MUST be the exact quote(s) followed by the citation [Page X]. If the answer spans multiple chunks/pages, include all relevant citations.\n"
            "4. **IMAGE HINT (CRITICAL):** If the answer explicitly references a figure or if the question asks for a 'diagram,' your output must ALSO include the reference [FIG:Page X] at the end, using the page number where the diagram/figure is found in the context. If multiple pages are relevant, use the page number where the main diagram is located.\n"
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
        if mode == "VERBATIM" and "[FIG:" in answer_text and uploaded_pdf_path:
            try:
                page_match = answer_text.split('[FIG:Page ')[1].split(']')[0]
                # Ensure the extracted page number is an integer
                page_num = int(''.join(filter(str.isdigit, page_match)))

                image_data = extract_and_crop_image(uploaded_pdf_path, page_num)
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
    port = int(os.environ.get("PORT", 5000))
    # CRITICAL: Bind to 0.0.0.0 and set debug to False for public servers
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
