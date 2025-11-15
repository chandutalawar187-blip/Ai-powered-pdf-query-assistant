# server/app.py (FINAL COMPLETE BACKEND CODE - WITH RAZORPAY)

from flask import Flask, request, jsonify, send_from_directory
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
import concurrent.futures
import threading

# --- ‼️ NEW IMPORTS FOR RAZORPAY ‼️ ---
import razorpay
import hmac
import hashlib

# --- ‼️ END NEW IMPORTS ‼️ ---

# --- CRITICAL FIX: Load environment variables from .env file ---
load_dotenv()

# --- START: FIREBASE ADMIN INTEGRATION ---
import firebase_admin
from firebase_admin import credentials, auth, firestore

# ... (Firebase Admin SDK initialization code is correct) ...
try:
    FIREBASE_TYPE = os.getenv("FIREBASE_TYPE")
    FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
    FIREBASE_PRIVATE_KEY_ID = os.getenv("FIREBASE_PRIVATE_KEY_ID")
    FIREBASE_PRIVATE_KEY_RAW = os.getenv("FIREBASE_PRIVATE_KEY", "")
    FIREBASE_PRIVATE_KEY = FIREBASE_PRIVATE_KEY_RAW.replace(r'\n', '\n').strip()
    FIREBASE_CLIENT_EMAIL = os.getenv("FIREBASE_CLIENT_EMAIL")
    FIREBASE_CLIENT_ID = os.getenv("FIREBASE_CLIENT_ID")
    FIREBASE_AUTH_URI = os.getenv("FIREBASE_AUTH_URI")
    FIREBASE_TOKEN_URI = os.getenv("FIREBASE_TOKEN_URI")
    FIREBASE_AUTH_PROVIDER_X509_CERT_URL = os.getenv("FIREBASE_AUTH_PROVIDER_X509_CERT_URL")
    FIREBASE_CLIENT_X509_CERT_URL = os.getenv("FIREBASE_CLIENT_X509_CERT_URL")
    FIREBASE_UNIVERSE_DOMAIN = os.getenv("FIREBASE_UNIVERSE_DOMAIN")

    if not all([FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL]):
        raise EnvironmentError("Missing critical Firebase environment variables for initialization.")

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

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Admin SDK initialized.")

    db = firestore.client()
    print("✅ Firestore client initialized.")

except Exception as e:
    print(f"❌ FATAL WARNING: Firebase Admin SDK failed to load. Error: {e}")
    firebase_admin = None
    db = None
# --- END: FIREBASE ADMIN INTEGRATION ---


# --- ‼️ NEW: RAZORPAY CLIENT SETUP ‼️ ---
try:
    RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
    RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
    RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not all([RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET]):
        print("❌ FATAL WARNING: Razorpay environment variables not set. Payment will fail.")
        razorpay_client = None
    else:
        razorpay_client = razorpay.Client(
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
        )
        print("✅ Razorpay client initialized.")

except Exception as e:
    print(f"❌ FATAL WARNING: Razorpay client failed to load. Error: {e}")
    razorpay_client = None


# --- ‼️ END: RAZORPAY CLIENT SETUP ‼️ ---


# --- Decorator (Unchanged) ---
def get_user_and_profile(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not firebase_admin or not db:
            print("❌ DECORATOR ERROR: Firebase Admin/Firestore not initialized. Rejecting request.")
            return jsonify({"error": "Server authentication setup incomplete. Cannot verify user."}), 500

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            print("❌ DECORATOR ERROR: Missing or invalid Authorization header.")
            return jsonify({"error": "Unauthorized: Missing or invalid Authorization header."}), 401

        id_token = auth_header.split('Bearer ')[1]
        try:
            print("✅ DECORATOR: Verifying ID token...")
            decoded_token = auth.verify_id_token(id_token)
            user_id = decoded_token['uid']
            print(f"✅ DECORATOR: Token verified for user_id: {user_id}")

            print(f"✅ DECORATOR: Accessing Firestore for user: {user_id}")
            user_ref = db.collection('users').document(user_id)
            user_profile = user_ref.get()
            print("✅ DECORATOR: Firestore .get() successful.")

            if not user_profile.exists:
                print(f"✅ DECORATOR: New user. Creating profile for: {user_id}")
                default_profile = {
                    'plan': 'free',
                    'query_count': 0,
                    'query_limit': 50,
                    'email': decoded_token.get('email', 'N/A')
                }
                user_ref.set(default_profile)
                print("✅ DECORATOR: Firestore .set() successful.")
                request.user_profile = default_profile
            else:
                print(f"✅ DECORATOR: Existing user. Profile found for: {user_id}")
                request.user_profile = user_profile.to_dict()

            request.user_id = user_id
            request.user_ref = user_ref
            print(f"✅ DECORATOR: Profile loaded. Handing off to route: {f.__name__}")

        except auth.InvalidIdTokenError as e:
            print(f"❌ DECORATOR ERROR: Firebase Token INVALID: {e}")
            return jsonify(
                {"error": "Unauthorized: Invalid ID token. Clocks might be skewed or projects mismatched."}), 401
        except Exception as e:
            print(f"❌ DECORATOR ERROR: A non-token error occurred (likely Firestore): {e}")
            traceback.print_exc()
            return jsonify({"error": f"Unauthorized: Could not verify user profile. {e}"}), 401  # Pass error back

        return f(*args, **kwargs)

    return decorated_function


# --- END Decorator ---


# --- INITIAL SETUP (Unchanged) ---
build_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'client', 'build'))
print(f"--- 🚀 Serving static files from: {build_folder} ---")
app = Flask(__name__,
            static_folder=build_folder,
            static_url_path='')
CORS(app, supports_credentials=True)
client = None
try:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not found. API functions will fail.")
    else:
        client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini client: {e}")
USER_DATA_DIR = os.path.join(tempfile.gettempdir(), 'ai_pdf_user_data')
os.makedirs(USER_DATA_DIR, exist_ok=True)
USER_SESSIONS = {}
session_lock = threading.Lock()


# --- END INITIAL SETUP ---


# --- HELPER FUNCTIONS (Unchanged) ---
def get_user_data_path(user_id):
    if not user_id: return None
    user_dir = os.path.join(USER_DATA_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    return user_dir


def get_user_metadata_path(user_id):
    user_dir = get_user_data_path(user_id)
    return os.path.join(user_dir, 'session_data.json')


def save_session_data(user_id, session):
    with session_lock:
        try:
            metadata_path = get_user_metadata_path(user_id)
            with open(metadata_path, 'w') as f:
                json.dump(session, f)
        except Exception as e:
            print(f"CRITICAL ERROR: Failed to save session for user {user_id}: {e}")


def get_session_data(user_id):
    if user_id in USER_SESSIONS:
        return USER_SESSIONS[user_id]
    with session_lock:
        if user_id in USER_SESSIONS:
            return USER_SESSIONS[user_id]
        metadata_path = get_user_metadata_path(user_id)
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    session = json.load(f)
                    USER_SESSIONS[user_id] = session
                    print(f"Loaded persistent session from disk for user {user_id}")
                    return session
            except Exception as e:
                print(f"Error loading session from disk for user {user_id}: {e}")
        print(f"Creating new in-memory session for user {user_id}")
        new_session = {
            'notes_pdf_path': None,
            'paper_pdf_path': None,
            'document_text_chunks': [],
            'query_history': [],
            'uploaded_files': []
        }
        USER_SESSIONS[user_id] = new_session
        return new_session


def extract_and_crop_image(pdf_path, page_number):
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
        return None
    finally:
        if doc: doc.close()


def perform_ocr_on_page(pdf_path, page_index, client):
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
        if doc: doc.close()


def is_pdf_handwritten(pdf_path, client):
    doc = None
    try:
        doc = fitz.open(pdf_path)
        if len(doc) == 0: return False
        page = doc[0]
        zoom_matrix = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=zoom_matrix)
        img_bytes = pix.tobytes(output="png")
        prompt_parts = [
            genai.types.Part.from_bytes(data=img_bytes, mime_type='image/png'),
            "Is this document primarily handwritten or is it computer-typed? Answer with only one word: 'Handwritten' or 'Typed'."
        ]
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_parts,
            config={"system_instruction": "You are a document classifier."}
        )
        text_response = response.text.strip().lower()
        print(f"Handwriting check result: {text_response}")
        return 'handwritten' in text_response
    except Exception as e:
        print(f"GEMINI Handwriting Check FAILED: {e}")
        return False
    finally:
        if doc: doc.close()


def extract_text_and_chunk(pdf_path, user_id, file_id, is_notes_file=True):
    session = get_session_data(user_id)
    source_label = "[NOTES]" if is_notes_file else "[PAPER]"
    pdf_filename = os.path.basename(pdf_path)
    cache_path = os.path.join(get_user_data_path(user_id), f"{file_id}.json")

    if os.path.exists(cache_path):
        print(f"Loading OCR cache for {pdf_filename}...")
        with open(cache_path, 'r') as f:
            cached_data = json.load(f)
            unlabeled_chunks = cached_data.get('chunks', [])
            labeled_chunks = [f"{source_label} {chunk}" for chunk in unlabeled_chunks]
            return True, labeled_chunks

    try:
        reader = pypdf.PdfReader(pdf_path)
        num_pages = len(reader.pages)
        raw_text_storage = {}
        pages_to_ocr_indices = []

        print(f"Triage Phase: Scanning {num_pages} pages for {pdf_filename}...")
        for i in range(num_pages):
            page = reader.pages[i]
            text = page.extract_text()
            if len(text) < 100 and client:
                pages_to_ocr_indices.append(i)
                raw_text_storage[i] = ""
            else:
                raw_text_storage[i] = text if text else f"[NO READABLE TEXT ON PAGE {i + 1}]"
        print(f"Triage Complete: {len(pages_to_ocr_indices)} pages flagged for OCR.")

        if pages_to_ocr_indices:
            def ocr_task(page_index):
                ocr_text = perform_ocr_on_page(pdf_path, page_index, client)
                return page_index, ocr_text

            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                print(f"Starting parallel OCR for {len(pages_to_ocr_indices)} pages...")
                results = executor.map(ocr_task, pages_to_ocr_indices)
                for page_index, ocr_text in results:
                    raw_text_storage[page_index] = ocr_text if ocr_text else f"[OCR FAILED ON PAGE {page_index + 1}]"
            print("Parallel OCR complete.")

        unlabeled_chunks = []
        labeled_chunks = []
        for page_index, text in sorted(raw_text_storage.items()):
            page_number = page_index + 1
            chunk_size = 1000
            for j in range(0, len(text), chunk_size):
                chunk = text[j:j + chunk_size]
                unlabeled_chunk = f"[Page {page_number}] {chunk}"
                unlabeled_chunks.append(unlabeled_chunk)
                labeled_chunks.append(f"{source_label} {unlabeled_chunk}")

        with open(cache_path, 'w') as f:
            json.dump({'chunks': unlabeled_chunks}, f)
        return True, labeled_chunks
    except Exception as e:
        print(f"Error during PDF processing/OCR: {e}")
        traceback.print_exc()
        return False, []


def get_question_text_from_paper(question_number, session):
    paper_pdf_path = session.get('paper_pdf_path')
    if not paper_pdf_path: return None
    try:
        paper_text = ""
        reader = pypdf.PdfReader(paper_pdf_path)
        for page in reader.pages:
            paper_text += page.extract_text() + "\n"
        q_num_match = re.search(r'\d+', question_number)
        if not q_num_match: return None
        num = q_num_match.group()
        pattern = re.compile(
            r'(?:Q|Question)?\s*' + re.escape(num) +
            r'[\.\)\s]+(.*?)(?=' +
            r'\s*(?:Q|Question)?\s*(\d+)\s*[\.\)\s]+|\Z)',
            re.DOTALL | re.IGNORECASE
        )
        match = pattern.search(paper_text)
        if match:
            q_text = match.group(1).strip()
            q_text = re.sub(r'\s+[a-z][\.\)]?\s*$', '', q_text, flags=re.IGNORECASE).strip()
            if q_text and len(q_text) > 5:
                return q_text
        print("DEBUG: Question regex failed. Using original query as fallback.")
        return question_number
    except Exception as e:
        print(f"ERROR reading question paper: {e}")
        return None


# --- END HELPER FUNCTIONS ---


# --- API ENDPOINTS ---
@app.route('/', methods=['GET'])
def homepage_status():
    return jsonify({"status": "API Server is running successfully."}), 200


# --- AUTH/USER ENDPOINTS ---
@app.route('/auth/status', methods=['GET'])
def auth_status():
    return jsonify({"message": "Auth status handled by Firebase client."}), 200


@app.route('/auth/login', methods=['POST'])
@app.route('/auth/register', methods=['POST'])
@app.route('/auth/logout', methods=['POST'])
def auth_placeholder_routes():
    return jsonify({"message": "Authentication handled client-side by Firebase."}), 200


@app.route('/get-user-profile', methods=['GET'])
@get_user_and_profile
def get_profile():
    return jsonify(request.user_profile), 200


# --- END AUTH/USER ENDPOINTS ---


# --- ‼️ DELETED ENDPOINT ‼️ ---
# The old /upgrade-plan route is GONE.
# --- ‼️ END DELETED ENDPOINT ‼️ ---


# --- ‼️ NEW: RAZORPAY ENDPOINT ‼️ ---
@app.route('/create-payment-order', methods=['POST'])
@get_user_and_profile
def create_payment_order():
    user_id = request.user_id
    user_profile = request.user_profile

    if user_profile['plan'] == 'paid':
        return jsonify({"error": "You are already on a Pro plan."}), 400

    if not razorpay_client:
        return jsonify({"error": "Payment system is not configured."}), 500

    # Amount is in paise (₹99.00 -> 9900 paise)
    payment_amount = 9900
    payment_currency = 'INR'

    try:
        # Create a Razorpay order
        order = razorpay_client.order.create({
            'amount': payment_amount,
            'currency': payment_currency,
            'receipt': f'user_{user_id}',
            'notes': {
                'user_id': user_id,  # ⬅️ CRITICAL: This links the payment to the user
                'email': user_profile.get('email', 'N/A')
            }
        })

        # Send the order_id and key back to the frontend
        return jsonify({
            'order_id': order['id'],
            'key_id': RAZORPAY_KEY_ID,
            'amount': order['amount'],
            'currency': order['currency'],
            'user_email': user_profile.get('email', 'N/A'),
            'username': user_profile.get('username', 'User')  # Get username from profile if available
        }), 200

    except Exception as e:
        print(f"❌ RAZORPAY ERROR: Failed to create order for user {user_id}: {e}")
        traceback.print_exc()
        return jsonify({"error": f"Failed to create payment order: {e}"}), 500


# --- ‼️ END: RAZORPAY ENDPOINT ‼️ ---


# --- ‼️ NEW: WEBHOOK ENDPOINT ‼️ ---
@app.route('/payment-webhook', methods=['POST'])
def payment_webhook():
    if not RAZORPAY_WEBHOOK_SECRET or not razorpay_client:
        print("❌ WEBHOOK ERROR: Razorpay secrets not configured.")
        return jsonify({"error": "Webhook service not configured."}), 500

    webhook_body = request.data
    webhook_signature = request.headers.get('X-Razorpay-Signature')

    if not webhook_signature:
        return jsonify({"error": "Missing signature."}), 400

    try:
        # 1. Verify the signature
        razorpay_client.utility.verify_webhook_signature(
            webhook_body.decode('utf-8'),
            webhook_signature,
            RAZORPAY_WEBHOOK_SECRET
        )
    except razorpay.errors.SignatureVerificationError as e:
        print(f"❌ WEBHOOK ERROR: Invalid signature: {e}")
        return jsonify({"error": "Invalid webhook signature."}), 400
    except Exception as e:
        print(f"❌ WEBHOOK ERROR: Verification failed: {e}")
        return jsonify({"error": "Webhook verification failed."}), 500

    # 2. Signature is valid. Decode the event.
    try:
        event = json.loads(webhook_body)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON."}), 400

    # 3. Handle the 'order.paid' event
    if event.get('event') == 'order.paid':
        print("✅ WEBHOOK: Received order.paid event.")
        try:
            payment_entity = event['payload']['payment']['entity']
            order_entity = event['payload']['order']['entity']

            # 4. Get the user_id we stored in the notes!
            user_id = order_entity['notes'].get('user_id')

            if not user_id:
                print("❌ WEBHOOK CRITICAL: user_id missing from order notes!")
                return jsonify({"error": "User ID missing from order."}), 400

            if not db:
                print("❌ WEBHOOK CRITICAL: Firestore client (db) is not available.")
                return jsonify({"error": "Database client not initialized."}), 500

            # 5. ‼️ THIS IS THE LOGIC from your old /upgrade-plan ‼️
            print(f"✅ WEBHOOK: Upgrading plan for user: {user_id}")
            user_ref = db.collection('users').document(user_id)
            user_ref.update({
                'plan': 'paid',
                'query_limit': -1,
                'query_count': 0,
                'last_payment_id': payment_entity['id']
            })

            print(f"✅ WEBHOOK: Successfully upgraded user {user_id} to Pro.")

        except Exception as e:
            print(f"❌ WEBHOOK ERROR: Failed to process order.paid event: {e}")
            traceback.print_exc()
            return jsonify({"status": "error", "message": "Failed to update user profile"}), 500

    # 6. Acknowledge receipt
    return jsonify({"status": "ok"}), 200


# --- ‼️ END: WEBHOOK ENDPOINT ‼️ ---


# --- FILE MANAGER ENDPOINTS (Unchanged) ---
@app.route('/files', methods=['GET'])
@get_user_and_profile
def get_files():
    user_id = request.user_id
    session = get_session_data(user_id)
    return jsonify(session['uploaded_files']), 200


@app.route('/files/<file_id>', methods=['DELETE'])
@get_user_and_profile
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
    session['document_text_chunks'].clear()
    session['query_history'].clear()
    if file_to_delete['path'] == session.get('notes_pdf_path'):
        session['notes_pdf_path'] = None
    if file_to_delete['path'] == session.get('paper_pdf_path'):
        session['paper_pdf_path'] = None
    for file in session['uploaded_files']:
        is_active_notes = (file['type'] == 'notes' and file['path'] == session.get('notes_pdf_path'))
        is_paper = (file['type'] == 'paper')
        if is_active_notes or is_paper:
            success, new_chunks = extract_text_and_chunk(file['path'], user_id, file['id'],
                                                         is_notes_file=is_active_notes)
            if success:
                session['document_text_chunks'].extend(new_chunks)
    save_session_data(user_id, session)
    return jsonify({"message": f"File {file_to_delete['filename']} deleted successfully."}), 200


@app.route('/set-active-notes', methods=['POST'])
@get_user_and_profile
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
        session['notes_pdf_path'] = file_to_activate['path']
        session['document_text_chunks'].clear()
        session['query_history'].clear()
        success, notes_chunks = extract_text_and_chunk(
            file_to_activate['path'], user_id, file_to_activate['id'], is_notes_file=True
        )
        if success:
            session['document_text_chunks'].extend(notes_chunks)
        paper_file_meta = next((f for f in session['uploaded_files'] if f['type'] == 'paper'), None)
        if paper_file_meta:
            success, paper_chunks = extract_text_and_chunk(
                paper_file_meta['path'], user_id, paper_file_meta['id'], is_notes_file=False
            )
            if success:
                session['document_text_chunks'].extend(paper_chunks)
        save_session_data(user_id, session)
        return jsonify({
            "message": f"Successfully set '{file_to_activate['filename']}' as the active Notes source.",
            "filename": file_to_activate['filename']
        }), 200
    except Exception as e:
        print(f"Error setting active notes file: {e}")
        return jsonify({"error": f"Internal server error: {e}"}), 500


# --- END FILE MANAGER ENDPOINTS ---


# --- UPLOAD ENDPOINTS (Fixed logic) ---
@app.route('/upload-notes', methods=['POST'])
@get_user_and_profile
def upload_notes_pdf():
    user_id = request.user_id
    user_profile = request.user_profile
    if 'pdf' not in request.files: return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']
    return handle_upload_logic(pdf_file, user_id, user_profile, is_notes_file=True)


@app.route('/upload-paper', methods=['POST'])
@get_user_and_profile
def upload_paper_pdf():
    user_id = request.user_id
    user_profile = request.user_profile
    if 'pdf' not in request.files: return jsonify({"error": "No file part"}), 400
    pdf_file = request.files['pdf']
    return handle_upload_logic(pdf_file, user_id, user_profile, is_notes_file=False)


# --- FIXED handle_upload_logic function ---
def handle_upload_logic(file, user_id, user_profile, is_notes_file):
    session = get_session_data(user_id)
    file_id = str(uuid.uuid4())
    user_dir = get_user_data_path(user_id)
    file_type = 'notes' if is_notes_file else 'paper'

    # Ensure a filename exists before proceeding
    if not file.filename:
        return jsonify({"error": "File name is missing or invalid."}), 400
    
    file_extension = os.path.splitext(file.filename)[1]
    saved_filename = f"{file_id}{file_extension}"
    file_path = os.path.join(user_dir, saved_filename)
    
    # --- CRITICAL FIX: Wrap file save and processing in a try/except block ---
    try:
        # 1. Save the file (This operation was the main vulnerability for uncaught exceptions)
        file.save(file_path)
        print(f"✅ File saved temporarily to: {file_path}")

        # 2. Handle premium feature check (Handwritten PDF)
        if is_notes_file and user_profile['plan'] == 'free':
            if is_pdf_handwritten(file_path, client):
                print(f"User {user_id} (free) blocked from uploading handwritten PDF.")
                os.remove(file_path) # Delete the temporary file
                return jsonify(
                    {"error": "Handwritten PDFs are a premium feature. Please upgrade to upload this file."}), 403

        # 3. Extract text and chunk (main processing)
        success, new_chunks = extract_text_and_chunk(file_path, user_id, file_id, is_notes_file=is_notes_file)

        if success:
            # 4. Success logic: Update session and file metadata
            file_meta = {
                'id': file_id,
                'filename': file.filename,
                'type': file_type,
                'path': file_path,
                'indexed_chunks': len(new_chunks),
                'uploaded_at': datetime.now().strftime("%Y-%m-%d %H:%M")
            }

            # Update the active file path and document chunks
            if is_notes_file:
                session['notes_pdf_path'] = file_path
                session['document_text_chunks'].clear()
                session['query_history'].clear()
                session['document_text_chunks'].extend(new_chunks)
                
                # Re-index paper if present to combine contexts
                paper_file_meta = next((f for f in session['uploaded_files'] if f['type'] == 'paper'), None)
                if paper_file_meta:
                    success, paper_chunks = extract_text_and_chunk(
                        paper_file_meta['path'], user_id, paper_file_meta['id'], is_notes_file=False
                    )
                    if success:
                        session['document_text_chunks'].extend(paper_chunks)
            else:
                session['paper_pdf_path'] = file_path
                session['document_text_chunks'].extend(new_chunks)

            # 5. Remove the OLD file of the same type and add the NEW one. 
            # FIX: Unify and simplify the logic for cleaning up old files by type.
            session['uploaded_files'] = [f for f in session['uploaded_files'] if f['type'] != file_type]
            session['uploaded_files'].append(file_meta)
            
            save_session_data(user_id, session)

            return jsonify(
                {"message": f"{file_type.capitalize()} processed successfully. {len(new_chunks)} chunks indexed.",
                 "chunks_count": len(new_chunks)}), 200
        else:
            # 6. Failed Processing logic: delete temporary file and return 500
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({"error": f"Failed to process {file_type.capitalize()} PDF. The file may be corrupt, password-protected, or require extensive OCR."}), 500

    except Exception as e:
        # 7. Catch all other errors (e.g., file save error, disk full, permission issue)
        print(f"CRITICAL UPLOAD ERROR for user {user_id}: {e}")
        traceback.print_exc()
        
        # Attempt cleanup if the file was saved before the exception
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as cleanup_e:
                print(f"Failed to clean up file {file_path} after error: {cleanup_e}")

        return jsonify({"error": f"Internal server error during upload: Failed to save or process file. Please check file format and server logs for details."}), 500
# --- END UPLOAD ENDPOINTS ---


# --- QUERY ENDPOINT (Unchanged, includes confirmation fix) ---
@app.route('/query', methods=['POST'])
@get_user_and_profile
def handle_query():
    user_id = request.user_id
    user_profile = request.user_profile
    user_ref = request.user_ref

    if user_profile['plan'] == 'free':
        if user_profile['query_count'] >= user_profile['query_limit']:
            return jsonify(
                {"error": f"Query limit of {user_profile['query_limit']} reached. Please upgrade to continue."}), 403

    data = request.json
    question = data.get('question', '').strip()
    session = get_session_data(user_id)

    if not client: return jsonify({"error": "AI client is not initialized. Check API Key."}), 500
    document_text_chunks = session['document_text_chunks']
    query_history = session['query_history']
    notes_pdf_path = session['notes_pdf_path']

    if not document_text_chunks and notes_pdf_path:
        print("WARNING: Session has chunks on disk but not in memory. Rebuilding context...")
        for file_meta in session['uploaded_files']:
            is_active_notes = (file_meta['type'] == 'notes' and file_meta['path'] == session.get('notes_pdf_path'))
            is_paper = (file_meta['type'] == 'paper')
            if is_active_notes or is_paper:
                success, new_chunks = extract_text_and_chunk(
                    file_meta['path'], user_id, file_meta['id'], is_notes_file=is_active_notes
                )
                if success:
                    session['document_text_chunks'].extend(new_chunks)
        document_text_chunks = session['document_text_chunks']
        save_session_data(user_id, session)

    if not document_text_chunks:
        return jsonify(
            {"error": "Please upload at least one PDF first, or ensure the active file is still present."}), 400

    lower_q = question.lower()
    q_num_match = re.search(r'(q\s*\d+|\s*question\s*\d+|\s*#\s*\d+)', lower_q)
    if q_num_match and session.get('paper_pdf_path'):
        q_num_str = q_num_match.group().strip()
        extracted_q_text = get_question_text_from_paper(q_num_str, session)
        if extracted_q_text:
            question = extracted_q_text
            lower_q = question.lower()

    history_context = "\n\n".join(query_history[-5:])
    if history_context:
        history_context = "--- Conversation History ---\n" + history_context + "\n------------------------------\n"
    else:
        history_context = ""

    full_text_keywords = ['explain all the pdf', 'give me the content', 'show all content', 'extract all text']
    if any(keyword in lower_q for keyword in full_text_keywords):
        full_text = "\n\n".join(document_text_chunks)
        return jsonify({"answer": full_text,
                        "sources": f"Complete content extracted from ALL uploaded files ({len(document_text_chunks)} chunks).",
                        "mode": "FULL_TEXT"})

    active_filename = "your document"
    if notes_pdf_path:
        active_file_meta = next((f for f in session['uploaded_files'] if f['path'] == notes_pdf_path), None)
        if active_file_meta:
            active_filename = active_file_meta['filename']

    comparison_keywords = ['compare', 'difference', 'differentiate', 'distinguish']
    is_comparison_request = any(keyword in lower_q for keyword in comparison_keywords)
    answer_text = ""
    mode = "VERBATIM"
    mode_info = ""

    if is_comparison_request:
        mode = "COMPARISON"
        topic_match = re.search(
            r'(?:compare|difference between|differentiate|distinguish)\s+(.*?)\s+(?:and|vs\.?|with)\s+(.*)', lower_q,
            re.IGNORECASE)
        topic_a = "Topic 1"
        topic_b = "Topic 2"
        if topic_match:
            try:
                raw_a = topic_match.group(1).strip()
                raw_b = topic_match.group(2).strip()
                topic_a = " ".join(raw_a.split()[:3]).upper()
                topic_b = " ".join(raw_b.split()[:3]).upper()
            except Exception as e:
                print(f"Regex topic extraction failed: {e}")

        keywords = lower_q.replace('compare', '').replace('difference', '').replace('differentiate', '').replace(
            'between', '').split()
        relevant_chunks = [chunk for chunk in document_text_chunks if any(kw in chunk.lower() for kw in keywords)][:30]
        context = "\n---\n".join(relevant_chunks)

        retrieved_pages = sorted(
            list(set([int(chunk.split('[Page ')[1].split(']')[0]) for chunk in relevant_chunks if '[Page ' in chunk])))

        page_ref_string = ""
        if retrieved_pages:
            page_ref_string = f" on pages {', '.join(map(str, retrieved_pages))}"
        mode_info = f"Comparison Table from '{active_filename}' (Used {len(relevant_chunks)} chunks from pages: {', '.join(map(str, retrieved_pages))})"

        confirmation_prefix = (
            f"**Confirmation:** 👍\n"
            f"Yes, this comparison table was generated directly from your uploaded file, **`{active_filename}`**. "
            f"The information was extracted from the content{page_ref_string} of that document.\n\n"
            "---\n\n"
        )
        failure_message = "Insufficient data for a comparison table was not found in the document."

        system_instruction = (
            f"You are an expert Data Structuring Analyst. Your job is to create a markdown comparison table from the CONTEXT. "
            f"1. **Find Data:** Locate information for the comparison in the CONTEXT. "
            f"2. **Format Table:** Create a markdown table. The table MUST have exactly three columns: 'Parameter', '{topic_a}', and '{topic_b}'. "
            f"3. **Format Output:** PREPEND the following confirmation message to your answer, exactly as written: \n`{confirmation_prefix}`\n"
            f"4. **Combine:** After the confirmation, provide the markdown table. "
            f"5. **FAILURE:** If information is not in the context, reply with ONLY the exact phrase: `{failure_message}`"
        )
        prompt = f"User Question: {question}\n\nCONTEXT:\n{context}"

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash', contents=prompt, config={"system_instruction": system_instruction}
            )
            answer_text = response.text
            if failure_message not in answer_text and active_filename not in answer_text:
                answer_text = confirmation_prefix + answer_text
        except APIError as e:
            answer_text = f"API FAILED during comparison: {str(e)}"
            mode = "ERROR"
    else:
        mode = "VERBATIM"
        fluff_words = ['name the', 'broad categories of', 'explain them briefly', 'the four', 'and', 'for', 'marks',
                       'briefly', 'neat diagram', 'with a', 'explain the', 'following the', 'model', 'hosts',
                       'communication', 'what is', 'what are', 'please explain', 'describe', 'definition', 'type of',
                       'in detail']
        cleaned_query_parts = lower_q.split()
        final_keywords = [word for word in cleaned_query_parts if word not in fluff_words and len(word) > 2]
        keywords = final_keywords

        relevant_chunks = [chunk for chunk in document_text_chunks if any(kw in chunk.lower() for kw in keywords)][:25]
        context = "\n---\n".join(relevant_chunks)

        retrieved_pages = sorted(
            list(set([int(chunk.split('[Page ')[1].split(']')[0]) for chunk in relevant_chunks if '[Page ' in chunk])))

        page_ref_string = ""
        if retrieved_pages:
            page_ref_string = f" on pages {', '.join(map(str, retrieved_pages))}"
        mode_info = f"Verbatim Extraction from '{active_filename}' (Used {len(relevant_chunks)} chunks from pages: {', '.join(map(str, retrieved_pages))})"

        confirmation_prefix = (
            f"**Confirmation:** 👍\n"
            f"Yes, this answer was generated directly from your uploaded file, **`{active_filename}`**. "
            f"The information was extracted from the content{page_ref_string} of that document.\n\n"
            "---\n\n"
        )
        failure_message = "The required information was not found in the uploaded document."

        system_instruction = (
            f"You are a MUTE, Document-Bound Extraction Specialist. Your ONLY job is to find the verbatim answer to the user's question from the CONTEXT provided. "
            f"1. **Find the Answer:** Locate the exact text in the CONTEXT that answers the question. "
            f"2. **Format the Output:** PREPEND the following confirmation message to your answer, exactly as written: \n`{confirmation_prefix}`\n"
            f"3. **Combine:** After the confirmation, provide the extracted verbatim answer. "
            f"4. **FAILURE:** If the answer is not in the context, reply with ONLY the exact phrase: `{failure_message}`"
        )
        prompt = f"CONVERSATION HISTORY: {history_context} \nUser Question: {question}\n\nCONTEXT:\n{context}"

        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash', contents=prompt, config={"system_instruction": system_instruction}
            )
            answer_text = response.text
            if failure_message not in answer_text and active_filename not in answer_text:
                answer_text = confirmation_prefix + answer_text
        except APIError as e:
            answer_text = f"API FAILED (QUOTA/KEY): {str(e)[:100]}..."
            mode = "ERROR"
            mode_info = f"VERBATIM (RAG failed to access API)"

    session['query_history'].append(f"Q: {question}")
    session['query_history'].append(f"A: {answer_text[:50]}...")
    save_session_data(user_id, session)
    image_data = None
    if notes_pdf_path and (mode == "VERBATIM"):
        try:
            page_match_raw = re.search(r'\[FIG:Page\s*(\d+)\]', answer_text)
            if page_match_raw:
                page_num = int(page_match_raw.group(1))
                image_data = extract_and_crop_image(session['notes_pdf_path'], page_num)
        except Exception as e:
            print(f"IMAGE PROCESSING/EXTRACTION ERROR: {e}")

    is_failure_message = failure_message in answer_text or "Insufficient data" in answer_text
    if user_profile['plan'] == 'free' and mode != "ERROR" and not is_failure_message:
        try:
            user_ref.update({'query_count': firestore.Increment(1)})
        except Exception as e:
            print(f"Failed to increment query count for {user_id}: {e}")

    return jsonify({
        "answer": answer_text,
        "sources": mode_info,
        "mode": mode,
        "image_data": image_data
    })


# --- END QUERY ENDPOINT ---


# --- GOOGLE SOLVE (Unchanged) ---
@app.route('/google-solve', methods=['POST'])
@get_user_and_profile
def handle_google_solve():
    user_id = request.user_id
    user_profile = request.user_profile
    user_ref = request.user_ref

    if user_profile['plan'] == 'free':
        if user_profile['query_count'] >= user_profile['query_limit']:
            return jsonify(
                {"error": f"Query limit of {user_profile['query_limit']} reached. Please upgrade to continue."}), 403

    data = request.json
    question = data.get('question', '').strip()

    if not client: return jsonify({"error": "AI client is not initialized. Check API Key."}), 500
    if not question: return jsonify({"error": "No question provided."}), 400

    try:
        session = get_session_data(user_id)
        document_text_chunks = session.get('document_text_chunks', [])
        notes_pdf_path = session.get('notes_pdf_path')
        if not document_text_chunks and notes_pdf_path:
            print(f"RAG-gate: Rebuilding context for user {user_id}...")
            for file_meta in session['uploaded_files']:
                is_active_notes = (file_meta['type'] == 'notes' and file_meta['path'] == notes_pdf_path)
                is_paper = (file_meta['type'] == 'paper')
                if is_active_notes or is_paper:
                    success, new_chunks = extract_text_and_chunk(
                        file_meta['path'], user_id, file_meta['id'], is_notes_file=is_active_notes
                    )
                    if success:
                        session['document_text_chunks'].extend(new_chunks)
            document_text_chunks = session['document_text_chunks']
            save_session_data(user_id, session)
        if not document_text_chunks:
            return jsonify({"error": "Please upload a relevant PDF before using the Google solve feature."}), 400

        lower_q = question.lower()
        fluff_words = ['name the', 'broad categories of', 'explain them briefly', 'the four', 'and', 'for', 'marks',
                       'briefly', 'neat diagram', 'with a', 'explain the', 'following the', 'model', 'hosts',
                       'communication', 'what is', 'what are', 'please explain', 'describe', 'definition', 'type of',
                       'in detail']
        cleaned_query_parts = lower_q.split()
        final_keywords = [word for word in cleaned_query_parts if word not in fluff_words and len(word) > 2]

        is_relevant = False
        if final_keywords:
            for chunk in document_text_chunks:
                if any(kw in chunk.lower() for kw in final_keywords):
                    is_relevant = True
                    break
        else:
            if any(lower_q in chunk.lower() for chunk in document_text_chunks):
                is_relevant = True

        if not is_relevant:
            print(f"Google solve blocked: Question '{question}' not relevant to PDF.")
            return jsonify(
                {"error": "This question does not appear to be related to the content of your uploaded PDF."}), 400
    except Exception as e:
        print(f"Error during RAG-gate check: {e}")
        return jsonify({"error": "Could not verify question relevance."}), 500

    print(f"RAG-gate passed. Proceeding to Google Search for: '{question}'")
    GOOGLE_SOLVE_INSTRUCTION = (
        "You are an expert, helpful Q&A assistant. Provide a clear and concise answer to the user's question."
    )

    answer_text = ""
    mode = "GOOGLE_SOLVE"

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=question,
            config={
                "system_instruction": GOOGLE_SOLVE_INSTRUCTION,
                "tools": [{"google_search": {}}]
            }
        )
        answer_text = response.text
    except APIError as e:
        answer_text = f"API FAILED (QUOTA/KEY): {str(e)[:100]}..."
        mode = "ERROR"
    except Exception as e:
        answer_text = f"An unknown error occurred: {str(e)}"
        mode = "ERROR"

    if user_profile['plan'] == 'free' and mode != "ERROR":
        try:
            user_ref.update({'query_count': firestore.Increment(1)})
        except Exception as e:
            print(f"Failed to increment query count for {user_id}: {e}")

    return jsonify({
        "answer": answer_text,
        "sources": "Answer generated using Google Search.",
        "mode": mode,
        "image_data": None
    })


# --- END GOOGLE SOLVE ---


# --- CATCH-ALL ROUTE (Unchanged) ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port, threaded=True)
