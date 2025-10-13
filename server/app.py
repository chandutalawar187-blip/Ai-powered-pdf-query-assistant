# server/app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pypdf  # PDF extraction library
from google import genai
from google.genai.errors import APIError

# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
# Enable CORS to allow React on one port to talk to Flask on another
CORS(app)

# Initialize Gemini Client
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    client = genai.Client(api_key=GEMINI_API_KEY)
except ValueError as e:
    print(f"Error: {e}")
    client = None

# Global state to hold the PDF text and pages (Our temporary "data management")
# In a real app, this would be a database/vector store
document_text_chunks = []
document_pages = {}  # {page_num: text}


def extract_text_and_chunk(pdf_path):
    """Task 1: Extracts text and chunks from PDF, storing page number metadata."""
    global document_text_chunks, document_pages
    document_text_chunks = []
    document_pages = {}

    try:
        reader = pypdf.PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            page_number = i + 1
            document_pages[page_number] = text

            # Simple chunking for now (500 chars). Add page context to chunk.
            chunk_size = 500
            for j in range(0, len(text), chunk_size):
                chunk = text[j:j + chunk_size]
                # Metadata embedded in the chunk
                document_text_chunks.append(f"[Page {page_number}] {chunk}")

        return True
    except Exception as e:
        print(f"Error during PDF processing: {e}")
        return False


# --- API ENDPOINTS ---

@app.route('/upload', methods=['POST'])
def upload_pdf():
    """Endpoint to handle file upload and text processing (Data Ingestion)."""
    if 'pdf' not in request.files:
        return jsonify({"error": "No file part"}), 400

    pdf_file = request.files['pdf']
    if pdf_file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save the file temporarily
    file_path = f"documents/{pdf_file.filename}"
    os.makedirs('documents', exist_ok=True)
    pdf_file.save(file_path)

    # Process the file and prepare the data store
    if extract_text_and_chunk(file_path):
        return jsonify({
            "message": f"PDF processed successfully. {len(document_text_chunks)} chunks indexed.",
            "chunks_count": len(document_text_chunks)
        })
    else:
        return jsonify({"error": "Failed to process PDF."}), 500


@app.route('/query', methods=['POST'])
def handle_query():
    """Task 2: Handles the user question and calls the Gemini API."""
    if not client:
        return jsonify({"error": "AI client not initialized. Check API Key."}), 500

    data = request.json
    question = data.get('question')

    if not document_text_chunks:
        return jsonify({"error": "Please upload a PDF first."}), 400

    # Task 2: Simplistic Search (CRUDE but fast for a hackathon)
    # Filter chunks based on question keyword presence.
    # For a real project, use embeddings (FAISS/langchain).

    keywords = question.lower().split()
    relevant_chunks = []
    for chunk in document_text_chunks:
        if any(kw in chunk.lower() for kw in keywords) or len(relevant_chunks) < 5:
            relevant_chunks.append(chunk)
        if len(relevant_chunks) >= 10:  # Take up to 10 for context
            break

    context = "\n---\n".join(relevant_chunks)

    # Core Challenge: Build the System Instruction to force verbatim answer
    system_instruction = (
        "You are an expert document query assistant. "
        "STRICTLY AND ONLY use the CONTEXT provided below to answer the user's question. "
        "DO NOT reword, summarize, or translate the text. "
        "Your answer MUST be a direct, verbatim quote from the context. "
        "Always include the source page number (e.g., [Page X]) in your response. "
        "If the answer is not in the CONTEXT, state: 'The required information was not found in the uploaded document.'"
    )

    prompt = f"User Question: {question}\n\nCONTEXT:\n{context}"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config={"system_instruction": system_instruction}
        )
        return jsonify({
            "answer": response.text,
            "debug_context_count": len(relevant_chunks)
        })
    except APIError as e:
        return jsonify({"error": f"Gemini API Error: {e.message}"}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {e}"}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)