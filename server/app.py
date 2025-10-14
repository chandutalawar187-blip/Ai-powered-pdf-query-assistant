# server/app.py (FINAL COMPLETE BACKEND CODE)

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
import tempfile  # For saving files during the session

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# Global state
client = None
uploaded_pdf_path = None
document_text_chunks = []
document_pages = {}

try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")


# server/app.py (Updated extract_and_crop_image function)

def extract_and_crop_image(pdf_path, page_number):
    """
    Renders the entire page where a figure is cited and returns it as a Base64 PNG.
    This ensures the full figure is displayed, bypassing complex bounding box math.
    """
    try:
        doc = fitz.open(pdf_path)
        # Page numbers in PyMuPDF are 0-indexed
        page = doc[page_number - 1]

        # We will render the ENTIRE page as an image to ensure the whole figure is visible
        # Use a high resolution (DPI) for a clear image display in the web browser
        zoom_matrix = fitz.Matrix(2, 2)  # 200% zoom (2x DPI)
        pix = page.get_pixmap(matrix=zoom_matrix)

        # Convert Pixmap to PNG bytes in memory
        img_bytes = pix.tobytes(output="png")

        # Encode to Base64
        base64_img = base64.b64encode(img_bytes).decode('utf-8')

        return f"data:image/png;base64,{base64_img}"

    except Exception as e:
        print(f"IMAGE EXTRACTION FAILED on page {page_number}: {e}")
        return None
    finally:
        # It's important to close the PyMuPDF document
        if 'doc' in locals() and not doc.is_closed:
            doc.close()

# --- CORE PDF PROCESSING ---

def extract_text_and_chunk(pdf_path):
    """Extracts text and chunks, storing page number metadata."""
    global document_text_chunks, document_pages
    document_text_chunks.clear()
    document_pages.clear()

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

    # CRITICAL: Save the file to a known temporary location for PyMuPDF access later
    temp_dir = tempfile.gettempdir()
    uploaded_pdf_path = os.path.join(temp_dir, pdf_file.filename)

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
    """Determines mode, executes query, and attempts image extraction."""
    if not client:
        return jsonify({"error": "AI client is not initialized. Check API Key."}), 500

    data = request.json
    question = data.get('question', '').strip()

    if not document_text_chunks:
        return jsonify({"error": "Please upload a PDF first."}), 400

    # --- 1. MODE DETECTION: FULL TEXT EXTRACTION (Bypass LLM) ---
    lower_q = question.lower()
    full_text_keywords = ['explain all the pdf', 'give me the content', 'show all content', 'extract all text']
    is_full_text_request = any(keyword in lower_q for keyword in full_text_keywords)

    if is_full_text_request:
        full_text = "\n\n".join(document_text_chunks)
        return jsonify({
            "answer": full_text,
            "sources": "Complete content extracted from ALL pages.",
            "mode": "FULL_TEXT"
        })

    # --- 2. MODE: HYPER-VERBATIM EXTRACTION (RAG) ---

    # Simple keyword retrieval logic (aggressive)
    keywords = lower_q.split()
    # Ensure necessary keywords are included (e.g., if the user asks "What is it?")
    essential_keywords = set(['iot', 'atm', 'remote anchoring', 'anchoring'])
    keywords = list(set(keywords) | essential_keywords)

    relevant_chunks = [
        chunk for chunk in document_text_chunks
        if any(kw in chunk.lower() for kw in keywords)
    ][:100]

    context = "\n---\n".join(relevant_chunks)
    mode_info = f"Verbatim Extraction Mode (Using {len(relevant_chunks)} chunks)"

    # HYPER-STRICT EXTRACTION INSTRUCTION (Zero-Tolerance)
    system_instruction = (
        "You are a MUTE, Document-Bound Extraction Specialist. Your ONLY source of knowledge is the CONTEXT. "
        "Your task is to identify and return the single most relevant sentence or phrase that DIRECTLY and VERBATIM answers the user's question from the CONTEXT provided.\n"
        "RULES:\n"
        "1. **MUST BE VERBATIM:** The answer MUST be copied EXACTLY from the CONTEXT.\n"
        "2. **NO 'THINKING':** You MUST NOT summarize, paraphrase, or add any commentary/extra words.\n"
        "3. **CITATION:** The entire output MUST be the exact quote(s) followed by the citation [Page X].\n"
        "4. **IMAGE HINT:** If the answer explicitly references a figure (e.g., Figure 4.7), your output must ALSO include the reference [FIG:Page X] at the end, using the page number where the figure is located.\n"
        "5. **FAILURE:** If the answer is not in the context, reply with the exact phrase: 'The required information was not found in the uploaded document.'"
    )

    # --- 3. EXECUTE GEMINI QUERY ---
    prompt = f"User Question: {question}\n\nCONTEXT:\n{context}"
    image_data = None

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"system_instruction": system_instruction}
        )

        answer_text = response.text

        # --- IMAGE DETECTION AND EXTRACTION ---
        if uploaded_pdf_path and "[FIG:" in answer_text:
            try:
                # Extract page number from the Gemini output
                page_match = answer_text.split('[FIG:Page ')[1].split(']')[0]
                page_num = int(page_match)

                # Call the image extraction helper
                image_data = extract_and_crop_image(uploaded_pdf_path, page_num)

            except Exception as e:
                print(f"IMAGE PROCESSING/EXTRACTION ERROR: {e}")

        # Successful response
        return jsonify({
            "answer": answer_text,
            "sources": mode_info,
            "mode": "VERBATIM",
            "image_data": image_data  # Send Base64 image data
        })

    except APIError as e:
        user_facing_error = f"API FAILED (QUOTA/KEY): {str(e)[:100]}..."
        return jsonify({"error": user_facing_error}), 500
    except Exception as e:
        user_facing_error = f"SERVER CRASHED: Unhandled Python Error ({e.__class__.__name__})."
        return jsonify({"error": user_facing_error}), 500


if __name__ == '__main__':
    # Increase the timeout just in case the AI call takes a moment
    app.run(debug=True, port=5000, threaded=True)