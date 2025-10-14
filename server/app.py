# server/app.py (FINAL HACKATHON CODE - FOCUS: VERBATIM EXTRACTION)
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pypdf
from google import genai
from google.genai.errors import APIError

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
CORS(app)

# Initialize Gemini Client (Checking API Key status)
client = None
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")

# Global state to hold the PDF text and pages
document_text_chunks = []
document_pages = {}


def extract_text_and_chunk(pdf_path):
    """Extracts text and chunks from PDF, storing page number metadata."""
    global document_text_chunks, document_pages
    document_text_chunks.clear()
    document_pages.clear()

    try:
        reader = pypdf.PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            page_number = i + 1
            document_pages[page_number] = text

            # Use larger chunks to ensure full sentences/paragraphs are retrieved
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
    """Handles file upload and sets up the global text chunks."""
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400

    pdf_file = request.files['pdf']
    file_path = f"documents/{pdf_file.filename}"
    os.makedirs('documents', exist_ok=True)
    pdf_file.save(file_path)

    if extract_text_and_chunk(file_path):
        return jsonify({
            "message": f"PDF processed successfully. {len(document_text_chunks)} chunks indexed.",
            "chunks_count": len(document_text_chunks)
        })
    else:
        return jsonify({"error": "Failed to process PDF."}), 500


# server/app.py (FINAL DEBUGGING VERSION OF handle_query)

# server/app.py (Updated handle_query to force ALL context for specific queries)

@app.route('/query', methods=['POST'])
def handle_query():
    # ... (all initial checks remain the same) ...

    data = request.json
    question = data.get('question', '').strip()

    if not document_text_chunks:
        return jsonify({"error": "Please upload a PDF first."}), 400

    # --- 1. MODE DETECTION: FULL TEXT EXTRACTION (Bypass LLM) ---
    lower_q = question.lower()
    full_text_keywords = ['explain all the pdf', 'give me the content', 'show all content', 'extract all text']
    is_full_text_request = any(keyword in lower_q for keyword in full_text_keywords)

    if is_full_text_request:
        # Returns raw text directly (no LLM call)
        full_text = "\n\n".join(document_text_chunks)
        return jsonify({
            "answer": full_text,
            "sources": "Complete content extracted from ALL pages.",
            "mode": "FULL_TEXT"
        })

    # --- 2. DYNAMIC CONTEXT ASSEMBLY FOR LLM CALL ---

    # NEW MAGIC KEYWORD to force the model to "see" the entire document for summarization/explanation
    scan_whole_pdf_keywords = ['scan the whole pdf', 'explain the whole document', 'full summary']
    is_full_scan_request = any(keyword in lower_q for keyword in scan_whole_pdf_keywords)

    if is_full_scan_request:
        # --- MODE: AGGRESSIVE FULL-CONTEXT SUMMARIZATION ---

        # AGGRESSION: Join ALL chunks (the entire PDF text)
        context = "\n---\n".join(document_text_chunks)

        # INSTRUCTION: Relax the verbatim rule for synthesis
        # HYPER-STRICT EXTRACTION INSTRUCTION (ZERO-TOLERANCE)
        system_instruction = (
            "You are a MUTE, Document-Bound Extraction Machine. "
            "Your ONLY source of knowledge is the CONTEXT provided below. "
            "If the information to answer the question is NOT in the CONTEXT, you have NO knowledge of it.\n\n"
            "RULES:\n"
            "1. **STRICT VERBATIM:** Your answer MUST be copied EXACTLY, word-for-word, from the CONTEXT.\n"
            "2. **NO WORLD KNOWLEDGE:** You MUST NOT use ANY information or external knowledge you may possess about the topic (e.g., historical dates, general definitions, related concepts). Your training data is useless for this task.\n"
            "3. **OUTPUT:** The entire output MUST be the exact quote followed immediately by the citation [Page X].\n"
            "4. **FAILURE MODE (CRITICAL):** If the answer is not in the context, you MUST reply with the exact phrase: 'The required information was not found in the uploaded document.\n"
            "5. **STRICT RULES:** Explain exact as in the pdf, don't take the answers from the any other source just give the exact answer that is present in the notes."
        )
        mode_info = "FULL_SCAN Summary Mode (Caution: Context may be large)"
        mode = "SUMMARY"

    else:
        # --- MODE: HYPER-VERBATIM EXTRACTION (RAG) ---

        # Default RAG mode: Retrieve only relevant chunks based on keywords
        keywords = lower_q.split()
        relevant_chunks = []
        for chunk in document_text_chunks:
            if any(kw in chunk.lower() for kw in keywords):
                relevant_chunks.append(chunk)
            if len(relevant_chunks) >= 20:
                break

        context = "\n---\n".join(relevant_chunks)

        # INSTRUCTION: Hyper-Strict Verbatim Rules (as previously perfected)
        system_instruction = (
            "You are a meticulous Document Extraction Specialist. Your task is to identify and return the single most relevant sentence or phrase "
            "that DIRECTLY and VERBATIM answers the user's question from the CONTEXT provided. "
            "RULES: 1. MUST BE VERBATIM. 2. NO 'THINKING'. 3. CITATION: MUST include the source page number [Page X]. 4. FAILURE: If not found, MUST reply with the exact phrase: 'The required information was not found in the uploaded document.'"
        )
        mode_info = f"Verbatim Extraction Mode (Using {len(relevant_chunks)} relevant chunks)"
        mode = "VERBATIM"

    # --- 3. EXECUTE GEMINI QUERY (for both Summary and Verbatim) ---
    prompt = f"User Question: {question}\n\nCONTEXT:\n{context}"

    print("-" * 50)
    print(f"DEBUG: Context Sent to Gemini:\n{context}")
    print("-" * 50)
    # ... then proceed with the Gemini call

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"system_instruction": system_instruction}
        )

        # ... (Safety and success checks remain the same) ...

        return jsonify({
            "answer": response.text,
            "sources": mode_info,
            "mode": mode
        })
    except APIError as e:
        # ... (error handling remains the same) ...
        return jsonify({"error": user_facing_error}), 500
    except Exception as e:
        # ... (error handling remains the same) ...
        return jsonify({"error": f"SERVER CRASHED: Unhandled Python Error ({e.__class__.__name__})."}), 500


if __name__ == '__main__':
    # ... (app.run remains the same) ...
    app.run(debug=True, port=5000, threaded=True)