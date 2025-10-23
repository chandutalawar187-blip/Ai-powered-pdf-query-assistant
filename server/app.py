# server/app.py (FINAL COMPLETE BACKEND CODE - SECURE ENVIRONMENT VARIABLES)

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import pypdf
from google import genai
from google.genai.errors import APIError
import fitz  # PyMuPDF for image extraction
import re
import tempfile
import traceback
import base64
import json
import uuid
from datetime import datetime
from functools import wraps

# --- CRITICAL FIX: Load environment variables from .env file ---
load_dotenv()

# --- START: FIREBASE ADMIN INTEGRATION ---
import firebase_admin
from firebase_admin import credentials, auth

# NOTE: The credentials must be loaded from external environment variables for security.
try:
    # --- READING SECRETS FROM ENVIRONMENT (os.getenv) ---
    FIREBASE_TYPE = os.getenv("FIREBASE_TYPE")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
    FIREBASE_PRIVATE_KEY_ID = os.getenv("FIREBASE_PRIVATE_KEY_ID")
    # CRITICAL: Reading the private key safely
    FIREBASE_PRIVATE_KEY = os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n')
    FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
    FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")
    FIREBASE_AUTH_URI = os.getenv("FIREBASE_AUTH_URI")
    FIREBASE_TOKEN_URI = os.getenv("FIREBASE_TOKEN_URI")
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL = os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL")
    FIREBASE_CLIENT_X509_CERT_URL = os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
    FIREBASE_UNIVERSE_DOMAIN = os.getenv("FIREBASE_UNIVERSE_DOMAIN")
    # --- END OF SECRET READING ---

    # Check if critical secrets are present before attempting initialization
    if not all([FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY_ID, FIREBASE_PRIVATE_KEY]):
        raise EnvironmentError("Missing critical Firebase environment variables.")

    # Create credential dictionary from environment variables
    cred_dict = {
        "type": FIREBASE_TYPE,
        "project_id": FIREBASE_PROJECT_ID,
        "private_key_id": FIREBASE_PRIVATE_KEY_ID,
        "private_key": FIREBASE_PRIVATE_KEY,
        "client_email": FIREBASE_CLIENT_EMAIL,
        "client_id": FIREBASE_CLIENT_ID,
        "auth_uri": FIREBASE_AUTH_URI,
        "token_uri": FIREBASE_TOKEN_URI,
        "auth_provider_x509_cert_url": FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
        "client_x509_cert_url": FIREBASE_CLIENT_X509_CERT_URL,
        "universe_domain": FIREBASE_UNIVERSE_DOMAIN
    }

    # Initialize the Firebase Admin SDK
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)


except EnvironmentError as ee:
    print(f"Warning: Firebase Admin SDK initialization skipped. {ee}")
except Exception as e:
    print(f"Warning: Firebase Admin SDK initialization failed. Error: {e}")

# NOTE: The 'firebase_admin' variable will be None if initialization failed.
if 'firebase_admin' not in locals():
    firebase_admin = None


# Decorator to verify Firebase ID Token
def verify_firebase_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not firebase_admin:
            print("WARNING: Firebase Admin not initialized. Skipping token verification.")
            return jsonify({"error": "Server authentication setup incomplete. Cannot verify user."}), 500

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized: Missing or invalid Authorization header."}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            # Verify the token using Firebase Admin SDK
            decoded_token = auth.verify_id_token(id_token)
            request.user_id = decoded_token['uid']  # Attach the user_id to the request object
        except Exception as e:
            print(f"Firebase Token Verification Failed: {e}")
            return jsonify({"error": "Unauthorized: Invalid or expired token."}), 401

        return f(*args, **kwargs)

    return decorated_function


# --- END: FIREBASE ADMIN INTEGRATION ---


# --- INITIAL SETUP ---
load_dotenv()
app = Flask(__name__)
# CRITICAL: Allow credentials to be sent (needed for cookies/session storage)
CORS(app, supports_credentials=True)

# Global state
client = None
try:
    # Read GEMINI_API_KEY from the environment (or .env file)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")

# Base directory to store user-specific files (Simulates Cloud Storage persistence)
USER_DATA_DIR = os.path.join(tempfile.gettempdir(), 'ai_pdf_user_data')
os.makedirs(USER_DATA_DIR, exist_ok=True)

# Global in-memory cache for all user sessions (Unchanged)
USER_SESSIONS = {}


# --- Helper functions (Verbatim) ---
def get_user_data_path(user_id):
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir


def get_session_data(user_id):
    if user_id not in USER_SESSIONS:
        USER_SESSIONS[user_id] = {
            'notes_pdf_path': None,
            'paper_pdf_path': None,
            'document_text_chunks': [],
            'query_history': [],
            'uploaded_files': []
        }
    return USER_SESSIONS[user_id]


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


def perform_ocr_on_page(pdf_path, page_index, client):
    """Renders a PDF page to an image and uses Gemini Vision for OCR."""
    doc = None
    try:
        doc = fitz.open(pdf_path)
        page = doc[page_index]
        zoom_matrix = fitz.Matrix(3, 3)
        pix = page.get_pixmap(matrix=zoom_matrix)
        img_bytes = pix.tobytes(output="png")

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


def extract_text_and_chunk(pdf_path, user_id, file_id, is_notes_file=True):
    """Extracts text, using OCR fallback, and updates the user's session data/cache."""

    session = get_session_data(user_id)
    source_label = "[NOTES]" if is_notes_file else "[PAPER]"
    new_chunks = []
    pdf_filename = os.path.basename(pdf_path)

    # 1. Check for OCR Cache (Simulated Persistence)
    cache_path = os.path.join(get_user_data_path(user_id), f"{file_id}.json")

    if os.path.exists(cache_path):
        print(f"Loading OCR cache for {pdf_filename}...")
        with open(cache_path, 'r') as f:
            cached_data = json.load(f)
            for chunk in cached_data['chunks']:
                new_chunks.append(f"{source_label} {chunk}")

    else:
        # --- Perform Native/OCR Extraction ---
        try:
            reader = pypdf.PdfReader(pdf_path)
            num_pages = len(reader.pages)
            raw_text_storage = []

            for i in range(num_pages):
                page = reader.pages[i]
                text = page.extract_text()

                # Heuristic Check for Handwritten/Scanned PDF (if text is too short)
                if len(text) < 100 and client:
                    print(f"ATTEMPTING OCR on Page {i + 1} (Sparse text detected)")
                    text = perform_ocr_on_page(pdf_path, i, client)  # Run Gemini OCR

                if not text: text = f"[NO READABLE TEXT ON PAGE {i + 1}]"

                raw_text_storage.append(text)

            # 2. Chunking based on retrieved text (OCR or Native)
            unlabeled_chunks = []  # For caching
            for page_index, text in enumerate(raw_text_storage):
                page_number = page_index + 1
                chunk_size = 1000
                for j in range(0, len(text), chunk_size):
                    chunk = text[j:j + chunk_size]

                    unlabeled_chunk = f"[Page {page_number}] {chunk}"
                    unlabeled_chunks.append(unlabeled_chunk)

                    new_chunks.append(f"{source_label} {unlabeled_chunk}")

            # 3. Save to cache after successful OCR/Extraction
            with open(cache_path, 'w') as f:
                json.dump({'chunks': unlabeled_chunks}, f)

        except Exception as e:
            print(f"Error during PDF processing/OCR: {e}")
            return False, 0

    # 4. Update Global Session State

    # NOTE: The 'notes' context clearing happens in the setter endpoints now (upload and set-active).
    # This function should only append the specific file's context.
    # We clear the document_text_chunks in the functions that call this one.

    return True, len(new_chunks)


def get_question_text_from_paper(question_number, session):
    """
    FIXED: Extracts question text using a more robust two-pass search logic.
    """
    paper_pdf_path = session.get('paper_pdf_path')
    if not paper_pdf_path:
        return None

    try:
        # 1. Extract raw text from the entire document
        paper_text = ""
        reader = pypdf.PdfReader(paper_pdf_path)
        for page in reader.pages:
            paper_text += page.extract_text() + "\n"

        # 2. Extract just the question number
        q_num_match = re.search(r'\d+', question_number)
        if not q_num_match:
            return None
        num = q_num_match.group()

        # 3. Aggressive pattern to find question text starting with the number and ending before the next number
        # Pattern: (Q/Question)? [Number] [Delimiter] (The actual question text) (?=next Q/EOF)
        pattern = re.compile(
            # Start with Q or Question (optional) followed by spaces and the question number
            r'(?:Q|Question)?\s*' + re.escape(num) +
            # Followed by a common delimiter (., ), spaces, and then the capture group
            r'[\.\)\s]+(.*?)(?=' +
            # Look ahead for the next question number or end of file
            r'\s*(?:Q|Question)?\s*(\d+)\s*[\.\)\s]+|\Z)',
            re.DOTALL | re.IGNORECASE
        )
        match = pattern.search(paper_text)

        if match:
            q_text = match.group(1).strip()
            # Clean up trailing options markers like (a), (b), etc.
            q_text = re.sub(r'\s+[a-z][\.\)]?\s*$', '', q_text, flags=re.IGNORECASE).strip()

            if q_text and len(q_text) > 5:
                return q_text

        # Fallback: If the regex fails, pass the original query string to the LLM.
        # This allows the model to attempt to interpret the original "Q1" query against the document.
        print("DEBUG: Question regex failed. Using original query as fallback.")
        return question_number

    except Exception as e:
        print(f"ERROR reading question paper: {e}")
        return None


# --- API ENDPOINTS ---

@app.route('/', methods=['GET'])
def homepage_status():
    """Confirms the API server is running for Render Health Checks."""
    return jsonify({"status": "API Server is running successfully."}), 200


@app.route('/auth/status', methods=['GET'])
def auth_status():
    """Client handles auth state via onAuthStateChanged."""
    return jsonify({"message": "Auth status handled by Firebase client."}), 200


@app.route('/auth/login', methods=['POST'])
@app.route('/auth/register', methods=['POST'])
@app.route('/auth/logout', methods=['POST'])
def auth_placeholder_routes():
    """Keep these endpoints to prevent network errors in case the client calls them, but they are unused now."""
    return jsonify({"message": "Authentication handled client-side by Firebase."}), 200


# --- FILE MANAGER ENDPOINTS (PROTECTED) ---

@app.route('/files', methods=['GET'])
@verify_firebase_token  # PROTECTED
def get_files():
    user_id = request.user_id
    session = get_session_data(user_id)
    return jsonify(session['uploaded_files']), 200


@app.route('/files/<file_id>', methods=['DELETE'])
@verify_firebase_token  # PROTECTED
def delete_file(file_id):
    user_id = request.user_id
    session = get_session_data(user_id)

    file_to_delete = next((f for f in session['uploaded_files'] if f['id'] == file_id), None)

    if not file_to_delete:
        return jsonify({"error": "File not found."}), 404

    try:
        os.remove(file_to_delete['path'])
    except Exception as e:
        print(f"File system deletion failed for {file_to_delete['path']}: {e}")

    try:
        cache_path = os.path.join(get_user_data_path(user_id), f"{file_id}.json")
        if os.path.exists(cache_path):
            os.remove(cache_path)
    except Exception as e:
        print(f"Cache deletion failed for {cache_path}: {e}")

    session['uploaded_files'] = [f for f in session['uploaded_files'] if f['id'] != file_id]

    # --- FIX: Rebuild Context after Deletion ---
    # Clearing and rebuilding ensures the context is correct for remaining files.
    session['document_text_chunks'].clear()
    session['query_history'].clear()

    # Also reset the main file path pointers if the current active files are deleted
    if file_to_delete['path'] == session.get('notes_pdf_path'):
        session['notes_pdf_path'] = None
    if file_to_delete['path'] == session.get('paper_pdf_path'):
        session['paper_pdf_path'] = None

    # Re-process remaining files to rebuild the context
    for file in session['uploaded_files']:
        # This conditional logic ensures we only rebuild the notes context
        # from the currently active notes file, not ALL notes files.
        is_active_notes = (file['type'] == 'notes' and file['path'] == session.get('notes_pdf_path'))
        is_paper = (file['type'] == 'paper')

        if is_active_notes or is_paper:
            # Manually rebuild chunks for the active file(s)
            success, count = extract_text_and_chunk(file['path'], user_id, file['id'], is_notes_file=is_active_notes)
            if success:
                # Need to manually extend the document_text_chunks since extract_text_and_chunk no longer does it globally
                source_label = "[NOTES]" if is_active_notes else "[PAPER]"
                # Re-read cached chunks to append them to the session's document_text_chunks
                cache_path = os.path.join(get_user_data_path(user_id), f"{file['id']}.json")
                if os.path.exists(cache_path):
                    with open(cache_path, 'r') as f:
                        cached_data = json.load(f)
                        labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                        session['document_text_chunks'].extend(labeled_chunks)

    return jsonify({"message": f"File {file_to_delete['filename']} deleted successfully."}), 200


# --- NEW ENDPOINT: SET ACTIVE NOTES FILE (FOR SESSION SHIFT) ---
@app.route('/set-active-notes', methods=['POST'])
@verify_firebase_token  # PROTECTED
def set_active_notes():
    user_id = request.user_id
    data = request.json
    file_id = data.get('fileId')

    if not file_id:
        return jsonify({"error": "File ID required."}), 400

    session = get_session_data(user_id)
    file_to_activate = next((f for f in session['uploaded_files'] if f['id'] == file_id and f['type'] == 'notes'), None)

    if not file_to_activate:
        return jsonify({"error": "Notes file not found or invalid type."}), 404

    try:
        # 1. Update the active path pointer
        session['notes_pdf_path'] = file_to_activate['path']

        # 2. Clear and rebuild the main RAG context using the new active notes file
        session['document_text_chunks'].clear()
        session['query_history'].clear()

        # Re-index the newly selected Notes file (to ensure chunks are present)
        success, count = extract_text_and_chunk(
            file_to_activate['path'],
            user_id,
            file_to_activate['id'],
            is_notes_file=True
        )

        # Manually append the chunks to session['document_text_chunks'] from cache
        source_label = "[NOTES]"
        cache_path = os.path.join(get_user_data_path(user_id), f"{file_to_activate['id']}.json")
        if os.path.exists(cache_path):
            with open(cache_path, 'r') as f:
                cached_data = json.load(f)
                labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                session['document_text_chunks'].extend(labeled_chunks)

        # Re-index any currently active paper file (if present)
        paper_file_meta = next((f for f in session['uploaded_files'] if f['type'] == 'paper'), None)
        if paper_file_meta:
            extract_text_and_chunk(paper_file_meta['path'], user_id, paper_file_meta['id'], is_notes_file=False)
            # Manually append paper chunks
            source_label = "[PAPER]"
            cache_path = os.path.join(get_user_data_path(user_id), f"{paper_file_meta['id']}.json")
            if os.path.exists(cache_path):
                with open(cache_path, 'r') as f:
                    cached_data = json.load(f)
                    labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                    session['document_text_chunks'].extend(labeled_chunks)

        if not success:
            return jsonify({"error": "Failed to re-index the selected notes file."}), 500

        return jsonify({
            "message": f"Successfully set '{file_to_activate['filename']}' as the active Notes source.",
            "filename": file_to_activate['filename']
        }), 200

    except Exception as e:
        print(f"Error setting active notes file: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500


# --- UPLOAD ENDPOINTS (PROTECTED) ---

@app.route('/upload-notes', methods=['POST'])
@verify_firebase_token  # PROTECTED
def upload_notes_pdf():
    user_id = request.user_id
    if 'pdf' not in request.files: return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']
    return handle_upload_logic(pdf_file, user_id, is_notes_file=True)


@app.route('/upload-paper', methods=['POST'])
@verify_firebase_token  # PROTECTED
def upload_paper_pdf():
    user_id = request.user_id
    if 'pdf' not in request.files: return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']
    return handle_upload_logic(pdf_file, user_id, is_notes_file=False)


def handle_upload_logic(file, user_id, is_notes_file):
    """Refactored common upload logic."""
    session = get_session_data(user_id)
    file_id = str(uuid.uuid4())
    user_dir = get_user_data_path(user_id)
    file_type = 'notes' if is_notes_file else 'paper'
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{file_id}{file_extension}"
    file_path = os.path.join(user_dir, saved_filename)
    file.save(file_path)

    # --- Process and create file metadata ---
    success, count = extract_text_and_chunk(file_path, user_id, file_id, is_notes_file=is_notes_file)

    if success:
        file_meta = {
            'id': file_id,
            'filename': file.filename,
            'type': file_type,
            'path': file_path,
            'indexed_chunks': count,
            'uploaded_at': datetime.now().strftime("%Y-%m-%d %H:%M")
        }

        # When uploading a *new* file, it becomes the active file for its type
        if is_notes_file:
            session['notes_pdf_path'] = file_path  # Set as active notes file
            # Since a new notes file is uploaded, we clear the RAG context and set the new context
            session['document_text_chunks'].clear()
            session['query_history'].clear()

            # Manually append the chunks to session['document_text_chunks'] from cache
            source_label = "[NOTES]"
            cache_path = os.path.join(get_user_data_path(user_id), f"{file_meta['id']}.json")
            if os.path.exists(cache_path):
                with open(cache_path, 'r') as f:
                    cached_data = json.load(f)
                    labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                    session['document_text_chunks'].extend(labeled_chunks)

            # Also re-index the currently active paper file (if present)
            paper_file_meta = next((f for f in session['uploaded_files'] if f['type'] == 'paper'), None)
            if paper_file_meta:
                # Manually append paper chunks
                source_label = "[PAPER]"
                cache_path = os.path.join(get_user_data_path(user_id), f"{paper_file_meta['id']}.json")
                if os.path.exists(cache_path):
                    with open(cache_path, 'r') as f:
                        cached_data = json.load(f)
                        labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                        session['document_text_chunks'].extend(labeled_chunks)

        else:
            session['paper_pdf_path'] = file_path  # Set as active paper file

        # Remove old file of the same type in the uploaded_files list
        # FIX: Only remove the old paper file if a new paper file is uploaded.
        if is_notes_file:
            # Check if a file with the same name already exists in metadata.
            # If so, remove the old instance before appending the new one.
            session['uploaded_files'] = [f for f in session['uploaded_files'] if f['filename'] != file_meta['filename']]
        else:
            # Remove only the old paper file (as only one paper file is needed for context)
            session['uploaded_files'] = [f for f in session['uploaded_files'] if f['type'] != file_type]

        session['uploaded_files'].append(file_meta)

        return jsonify({"message": f"{file_type.capitalize()} processed successfully. {count} chunks indexed.",
                        "chunks_count": count}), 200
    else:
        # Clean up failed file upload path
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({"error": f"Failed to process {file_type.capitalize()} PDF."}), 500


@app.route('/query', methods=['POST'])
@verify_firebase_token  # PROTECTED
def handle_query():
    user_id = request.user_id
    data = request.json
    question = data.get('question', '').strip()
    session = get_session_data(user_id)

    if not client: return jsonify({"error": "AI client is not initialized. Check API Key."}), 500

    document_text_chunks = session['document_text_chunks']
    query_history = session['query_history']
    notes_pdf_path = session['notes_pdf_path']  # Now points to the currently active notes file

    # --- NEW FIX: Rebuild session context if lost (e.g., after server restart) ---
    if not document_text_chunks and notes_pdf_path:
        print("WARNING: Document chunks lost. Attempting context rebuild from file metadata.")
        session['document_text_chunks'].clear()

        # Find all current files from metadata list
        for file_meta in session['uploaded_files']:
            is_active_notes = (file_meta['type'] == 'notes' and file_meta['path'] == session.get('notes_pdf_path'))
            is_paper = (file_meta['type'] == 'paper')

            if is_active_notes or is_paper:
                source_label = "[NOTES]" if is_active_notes else "[PAPER]"
                # Read chunks directly from cache
                cache_path = os.path.join(get_user_data_path(user_id), f"{file_meta['id']}.json")
                if os.path.exists(cache_path):
                    with open(cache_path, 'r') as f:
                        cached_data = json.load(f)
                        labeled_chunks = [f"{source_label} {chunk}" for chunk in cached_data['chunks']]
                        session['document_text_chunks'].extend(labeled_chunks)

        # Update chunks list after rebuild attempt
        document_text_chunks = session['document_text_chunks']

    if not document_text_chunks:
        return jsonify(
            {"error": "Please upload at least one PDF first, or ensure the active file is still present."}), 400

    lower_q = question.lower()

    # --- STEP 1: QUERY REWRITE (Question Number Logic) ---
    q_num_match = re.search(r'(q\s*\d+|\s*question\s*\d+|\s*#\s*\d+)', lower_q)

    if q_num_match and session.get('paper_pdf_path'):
        q_num_str = q_num_match.group().strip()
        extracted_q_text = get_question_text_from_paper(q_num_str, session)

        if extracted_q_text:
            question = extracted_q_text
            lower_q = question.lower()

    # --- PREPARE HISTORY CONTEXT ---
    history_context = "\n\n".join(query_history[-5:])
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

    # --- MODE 2: COMPARISON DETECTION (FIXED LOGIC) ---
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

        # --- MODIFIED SYSTEM INSTRUCTION TO PREVENT SUMMARIZATION AND FORCE TABLE OUTPUT WITH CORRECT HEADINGS ---
        system_instruction = (
            "You are an expert Data Structuring Analyst. Your task is to extract and structure comparison points for the two concepts in the user's question, using ONLY the CONTEXT provided.\n\nRULES:\n1. **STRICT OUTPUT FORMAT:** The entire output MUST be a single Markdown table. Do not output anything that is not part of the table, except the citation.\n2. **TABLE STRUCTURE (CRITICAL):** The table MUST have exactly three columns: 'Parameter', 'IoT', and 'CPS'. Use these exact headings for the data columns.\n3. **CONTENT PRIORITY:** Extract the distinct comparison points from the CONTEXT and place them directly into the appropriate cell. **You MUST use complete, verbatim phrases or sentences** from the CONTEXT for the 'IoT' and 'CPS' columns. Do NOT summarize, rephrase, or consolidate the content; break the source sentences into the table cells as directly as possible.\n4. **CITATION (CRITICAL):** Append the citation string {page_ref_string} at the very end of the markdown table on a separate line. The citation must be present.\n5. **NO QUOTES/INTRO/CLOSING:** Do NOT include any introductory or explanatory text or quotes outside the table and the citation.\n6. **FAILURE:** If information for a clear comparison table is not in the context, reply with the exact phrase: 'Insufficient data for a comparison table was found in the document.'")

        prompt = f"User Question: {question}\n\nCONTEXT:\n{context}\n\nCITATION STRING TO APPEND: {page_ref_string}"

        # Execute Comparison Query
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={"system_instruction": system_instruction}
            )
            answer_text = response.text
        except APIError as e:
            answer_text = f"API FAILED during comparison: {str(e)}"
            mode = "ERROR"

        # Return immediately if it was a comparison request (FIX APPLIED HERE)
        return jsonify({
            "answer": answer_text,
            "sources": mode_info,
            "mode": mode,
            "image_data": None
        })

    else:
        # --- MODE 3: VERBATIM EXTRACTION WITH SILENT GOOGLE CONFIRMATION ---
        mode = "VERBATIM_CONFIRMED_SILENT"

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

        # --- HYPER-STRICT EXTRACTION INSTRUCTION ---
        system_instruction = (
            "You are a MUTE, Document-Bound Extraction Specialist. Your ONLY source of knowledge is the CONTEXT. "
            "You MUST use the Google Search tool for confirmation, but your final answer MUST ONLY be sourced from the CONTEXT provided.\n"
            "RULES:\n"
            "1. **MUST BE VERBATIM:** The entire output MUST be copied EXACTLY from the CONTEXT. Do not reword, summarize, or add any commentary.\n"
            "2. **OUTPUT FORMAT:** The response MUST be the exact quote(s). Return all sentences/paragraphs necessary to provide the full explanation.\n"
            "3. **CITATION:** The entire response MUST be followed by the explicit citation [Page X]. If the answer spans multiple chunks/pages, include all relevant citations.\n"
            "4. **IMAGE HINT (CRITICAL):** If the answer explicitly references a figure or if the question asks for a 'diagram,' your output must ALSO include the reference [FIG:Page X] at the end, using the page number where the diagram/figure is found in the context.\n"
            "5. **FAILURE:** If the answer is not in the context, reply with the exact phrase: 'The required information was not found in the uploaded document.'")

        prompt = f"CONVERSATION HISTORY: {history_context} \nUser Question: {question}\n\nCONTEXT:\n{context}"

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "tools": [{"google_search": {}}]  # CRITICAL: Re-enabling Google Search Tool
                }
            )
            answer_text = response.text
        except APIError as e:
            answer_text = f"API FAILED (QUOTA/KEY): {str(e)[:100]}..."
            mode = "ERROR"
            mode_info = f"VERBATIM_CONFIRMED_SILENT (RAG failed to access API)"

    # --- 5. FINISH & RETURN RESPONSE ---

    # Success: Update History
    session['query_history'].append(f"Q: {question}")
    session['query_history'].append(f"A: {answer_text[:50]}...")

    image_data = None

    # Image Detection (now checks the final answer text)
    if notes_pdf_path and (mode == "VERBATIM_CONFIRMED_SILENT" or mode == "VERBATIM"):
        try:
            page_match_raw = re.search(r'\[FIG:Page\s*(\d+)\]', answer_text)
            if page_match_raw:
                page_num = int(page_match_raw.group(1))
                image_data = extract_and_crop_image(session['notes_pdf_path'], page_num)
        except Exception as e:
            print(f"IMAGE PROCESSING/EXTRACTION ERROR: {e}")

    # Successful response
    return jsonify({
        "answer": answer_text,
        "sources": mode_info,
        "mode": mode,
        "image_data": image_data
    })


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
