import os
import re
import fitz  # PyMuPDF
from flask import Flask, render_template, request, jsonify, Response, session, redirect, url_for
from dotenv import load_dotenv
from groq import Groq
import logging
import json
from typing import Dict, List
from functools import wraps
from authlib.integrations.flask_client import OAuth
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.utils import secure_filename
from PIL import Image
import uuid
import requests

# --- 1. INITIAL SETUP & CONFIGURATION ---
load_dotenv()
app = Flask(__name__)

app.config['SECRET_KEY'] = os.environ.get("FLASK_SECRET_KEY", "a_default_secret_key_for_testing")
app.config['GOOGLE_CLIENT_ID'] = os.environ.get("GOOGLE_CLIENT_ID")
app.config['GOOGLE_CLIENT_SECRET'] = os.environ.get("GOOGLE_CLIENT_SECRET")
SITE_PASSWORD = os.environ.get("SITE_PASSWORD")
SERPER_API_KEY = os.environ.get("SERPER_API_KEY")

UPLOAD_FOLDER = 'static/pfps'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- DATABASE SETUP ---
class Base(DeclarativeBase):
    pass
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///schoolsync.db"
db = SQLAlchemy(model_class=Base)
db.init_app(app)

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.String(100), primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=True)
    picture = db.Column(db.String(255), nullable=True)
    decks = db.relationship('FlashcardDeck', backref='user', lazy=True, cascade="all, delete-orphan")

class FlashcardDeck(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    cards = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.String(100), db.ForeignKey('user.id'), nullable=False)

with app.app_context():
    db.create_all()

# --- Logging setup ---
logging.basicConfig(level=logging.INFO)
gunicorn_logger = logging.getLogger('gunicorn.error')
if gunicorn_logger.handlers:
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

# --- 2. CONSTANTS & AI CONFIG ---
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
AI_MODEL = "llama3-8b-8192"

WRITING_SAMPLES = {}
GRADE_LEVEL_FILES = [
    'kindergarten', 'grade1', 'grade2', 'grade3', 'grade4', 'grade5', 'grade6', 
    'grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12', 'college'
]

for grade_key in GRADE_LEVEL_FILES:
    try:
        with open(f"{grade_key}.txt", "r", encoding="utf-8") as f:
            WRITING_SAMPLES[grade_key] = f.read()
    except FileNotFoundError:
        app.logger.warning(f"Writing sample file not found: {grade_key}.txt")
    except Exception as e:
        app.logger.error(f"Error reading writing sample '{grade_key}.txt': {e}")


PROMPTS: Dict[str, str] = {
    "homework_helper": "You are a friendly and encouraging tutor. Explain concepts clearly and guide the user to the answer without just giving it away. If search results are provided, use them to form your answer.",
    "study_guide_maker": "You are a hyper-organized study guide creator. Take the user's topic and create a concise, well-structured study guide with key points, definitions, and potential questions. Use the search results to ensure accuracy.",
    "concept_explainer": "You are a brilliant professor who can explain any concept. Use the provided search results to give an accurate, detailed explanation.",
    "pdf_qa": (
        "You are an expert assistant for questioning documents. Use ONLY the provided context to answer the user's question. "
        "The context will be provided before the question. If the answer cannot be found in the context, you must state: "
        "'The answer is not available in the provided document.' Do not use any external knowledge."
    ),
    "paper_grader": (
        "You are an expert writing tutor. Based on the student's grade level and the provided writing sample, give constructive feedback on their paper. Your response must be a single JSON object with keys: 'assessment', 'estimated_grade_level', 'strengths' (array), and 'suggestions' (array).\n"
        "**CONTEXTUAL WRITING SAMPLE for {grade_level}:**\n```\n{writing_sample}\n```\n\n"
        "**STUDENT'S SUBMISSION:**\n- Grade Level: {grade_level}\n- Paper Type: {paper_type}\n- Paper Text:\n'''\n{paper_text}\n'''"
    ),
    "flashcard_generator": (
        "You are an AI that creates flashcards. Based on the topic '{topic}', generate a JSON array of exactly {count} flashcards. "
        "Each object must have 'front' and 'back' keys. Your response must be ONLY the raw JSON array."
    ),
    "quiz_generator": (
        "You are an AI that creates factual, high-quality quizzes. Your primary goal is accuracy and generating a perfectly structured JSON array of questions based on a topic. Adhere strictly to the format.\n\n"
        "**TOPIC:** '{topic}'\n"
        "**NUMBER OF QUESTIONS:** {count}\n\n"
        "**RULES:**\n"
        "1.  Generate a JSON array of exactly {count} questions, mixing 'multiple_choice' and 'fill_in_the_blank' types.\n"
        "2.  All questions MUST be based on factual, verifiable knowledge. Do NOT invent scenarios or ask for opinions.\n"
        "3.  Your response MUST be ONLY the raw JSON array. Do not include any other text, explanations, or markdown formatting like ```json.\n\n"
        "**JSON STRUCTURE (MANDATORY):**\n"
        "Every object in the array MUST follow one of these two structures precisely:\n\n"
        "**1. Multiple Choice:**\n"
        "   - `type`: 'multiple_choice'\n"
        "   - `question`: A string.\n"
        "   - `options`: A JSON object (dictionary) where keys are capital letters (A, B, C, D) and values are strings.\n"
        "   - `correctAnswer`: The key of the correct option (e.g., 'C').\n"
        "   - `explanation`: A string explaining why the answer is correct.\n"
        "**2. Fill-in-the-Blank:**\n"
        "   - `type`: 'fill_in_the_blank'\n"
        "   - `question`: A string containing '___'.\n"
        "   - `correctAnswer`: A string for the blank.\n"
        "   - `explanation`: A string explanation."
    )
}
DEFAULT_PROMPT = PROMPTS.get("homework_helper", "You are a helpful assistant.")

client = None
if GROQ_API_KEY:
    client = Groq(api_key=GROQ_API_KEY)

# --- 3. AUTHENTICATION SETUP ---
oauth = OAuth(app)
google = oauth.register(
    name='google',
    client_id=app.config["GOOGLE_CLIENT_ID"],
    client_secret=app.config["GOOGLE_CLIENT_SECRET"],
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# --- DECORATORS ---
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login_gate'))
        return f(*args, **kwargs)
    return decorated_function

# --- 4. ROUTES ---

@app.route('/')
def login_gate():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html', show_password_form=bool(SITE_PASSWORD))

@app.route('/verify-password', methods=['POST'])
def verify_password():
    password = request.json.get('password')
    if password == SITE_PASSWORD:
        session['password_verified'] = True
        return jsonify({'success': True})
    else:
        return jsonify({'success': False}), 401

@app.route('/login')
def login():
    if SITE_PASSWORD and not session.get('password_verified'):
        return redirect(url_for('login_gate'))
    redirect_uri = url_for('authorize', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/authorize')
def authorize():
    token = oauth.google.authorize_access_token()
    user_info = oauth.google.userinfo()
    
    session.pop('password_verified', None)
    session['user'] = user_info
    
    user = User.query.get(user_info['sub'])
    if not user:
        user = User(id=user_info['sub'], email=user_info.get('email'), name=user_info.get('name'), picture=user_info.get('picture'))
        db.session.add(user)
    else:
        if not user.name: user.name = user_info.get('name')
        if not user.picture or 'googleusercontent.com' in user.picture: user.picture = user_info.get('picture')
    db.session.commit()
    
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
@login_required
def dashboard():
    user = User.query.get(session['user']['sub'])
    return render_template('index.html', user=user)

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login_gate'))

# --- 5. API ROUTES ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/user/settings', methods=['POST'])
@login_required
def update_user_settings():
    user_id = session['user']['sub']
    user = db.session.get(User, user_id)
    if not user:
        return jsonify(error="User not found"), 404
    new_username = request.form.get('username')
    if new_username:
        user.name = new_username.strip()
    new_pfp_url = None
    if 'profile_picture' in request.files:
        file = request.files['profile_picture']
        if file and file.filename != '' and allowed_file(file.filename):
            try:
                img = Image.open(file.stream)
                img.verify()
                file.seek(0)
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{user_id}_{uuid.uuid4()}.{ext}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(unique_filename))
                
                img = Image.open(file.stream)
                img.thumbnail((256, 256))
                img.save(filepath)

                if user.picture and os.path.basename(user.picture) != 'default.png' and 'googleusercontent.com' not in user.picture:
                    old_path = os.path.join(os.getcwd(), user.picture.lstrip('/'))
                    if os.path.exists(old_path):
                        os.remove(old_path)

                new_pfp_url = url_for('static', filename=f'pfps/{unique_filename}')
                user.picture = new_pfp_url
            
            except Exception as e:
                app.logger.error(f"PFP upload failed for user {user_id}: {e}")
                db.session.rollback()
                return jsonify(error="Image upload failed. The file might be corrupt."), 400
    db.session.commit()
    return jsonify({"success": True, "new_username": user.name, "new_pfp_url": new_pfp_url}), 200

@app.route('/api/decks', methods=['POST'])
@login_required
def save_deck():
    user_id = session['user']['sub']
    data = request.json
    deck_name = data.get('name')
    cards_data = data.get('cards')
    if not deck_name or not cards_data:
        return jsonify({"error": "Deck name and cards data are required."}), 400
    new_deck = FlashcardDeck(name=deck_name, cards=json.dumps(cards_data), user_id=user_id)
    db.session.add(new_deck)
    db.session.commit()
    return jsonify({"success": True, "id": new_deck.id, "name": new_deck.name}), 201

@app.route('/api/decks', methods=['GET'])
@login_required
def get_decks():
    user_id = session['user']['sub']
    decks = FlashcardDeck.query.filter_by(user_id=user_id).order_by(FlashcardDeck.id.desc()).all()
    deck_list = [{"id": deck.id, "name": deck.name, "cards": json.loads(deck.cards)} for deck in decks]
    return jsonify(deck_list)

@app.route('/api/decks/<int:deck_id>', methods=['DELETE'])
@login_required
def delete_deck(deck_id):
    user_id = session['user']['sub']
    deck = db.session.get(FlashcardDeck, deck_id)
    if not deck:
        return jsonify({"error": "Deck not found."}), 404
    if deck.user_id != user_id:
        return jsonify({"error": "Unauthorized."}), 403
    db.session.delete(deck)
    db.session.commit()
    return jsonify({"success": True})

@app.route('/api/ask-stream', methods=['POST'])
@login_required
def ask_stream_api():
    data = request.json
    messages: List[Dict[str, str]] = data.get('messages', [])
    mode = data.get('mode', 'homework_helper')
    pdf_context = data.get('pdf_context')

    if not client:
        return Response(json.dumps({"error": "AI service is not configured."}), status=503, mimetype='application/json')
    if not messages:
        return Response(json.dumps({"error": "No question provided."}), status=400, mimetype='application/json')

    system_prompt = PROMPTS.get(mode, DEFAULT_PROMPT)
    last_user_message = messages[-1]

    web_search_context = ""
    modes_that_need_web_search = ['homework_helper', 'study_guide_maker', 'concept_explainer']
    
    if mode in modes_that_need_web_search and SERPER_API_KEY:
        try:
            app.logger.info(f"Performing web search for query: {last_user_message['content']}")
            headers = { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' }
            payload = json.dumps({ "q": last_user_message['content'] })
            response = requests.post("https://google.serper.dev/search", headers=headers, data=payload, timeout=5)
            response.raise_for_status()
            search_results = response.json()
            web_search_context += "--- Web Search Results (for context) ---\n"
            if search_results.get('answerBox'):
                web_search_context += f"Answer Box: {search_results['answerBox']['snippet']}\n"
            for result in search_results.get('organic', [])[:4]:
                web_search_context += f"Title: {result['title']}\nSnippet: {result['snippet']}\n---\n"
        except requests.exceptions.RequestException as e:
            app.logger.error(f"Serper API request failed: {e}")
            web_search_context = "--- Web Search Failed ---\n"

    final_system_prompt = system_prompt
    if mode == 'pdf_qa' and pdf_context:
        last_user_message['content'] = f"CONTEXT:\n'''\n{pdf_context}\n'''\n\nQUESTION: {last_user_message['content']}"
    elif web_search_context:
        final_system_prompt = f"{web_search_context}\n\n{system_prompt}"

    full_message_payload = [{"role": "system", "content": final_system_prompt}] + messages
    
    def generate_stream():
        try:
            stream = client.chat.completions.create(model=AI_MODEL, messages=full_message_payload, stream=True, temperature=0.7)
            for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield f"data: {json.dumps({'token': content})}\n\n"
        except Exception as e:
            app.logger.error(f"Groq stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'error': 'An error occurred during the AI stream.'})}\n\n"
            
    return Response(generate_stream(), mimetype='text/event-stream')
    
@app.route('/api/generate-content', methods=['POST'])
@login_required
def generate_content_api():
    if not client: return jsonify({"error": "AI service is not configured."}), 503
    data = request.json
    mode = data.get('mode'); topic = data.get('topic'); count = data.get('count', 5) 
    if not all([mode, topic, count]): return jsonify({"error": "Missing 'mode', 'topic', or 'count'."}), 400
    prompt_template = PROMPTS.get(mode)
    if not prompt_template: return jsonify({"error": f"Invalid mode specified: {mode}."}), 400
    system_prompt = prompt_template.format(topic=topic, count=int(count))
    try:
        completion_params = { "messages": [{"role": "system", "content": system_prompt}], "model": AI_MODEL, "temperature": 0.6 }
        if mode != 'quiz_generator': completion_params["response_format"] = {"type": "json_object"}
        chat_completion = client.chat.completions.create(**completion_params)
        response_content = chat_completion.choices[0].message.content.strip()
        if response_content.startswith("```json"): response_content = response_content.strip("```json\n").strip("`\n")
        if mode == 'quiz_generator' and not response_content.startswith('['): response_content = f"[{response_content}]"
        parsed_json = json.loads(response_content)
        potential_list = []
        if isinstance(parsed_json, list): potential_list = parsed_json
        elif isinstance(parsed_json, dict) and len(parsed_json.keys()) == 1:
            key = list(parsed_json.keys())[0]
            if isinstance(parsed_json.get(key), list): potential_list = parsed_json[key]
        if mode == 'quiz_generator':
            valid_questions = []
            if not potential_list: raise ValueError(f"AI did not return a valid list. Response: {response_content}")
            for q in potential_list:
                if not isinstance(q, dict): continue
                q_type = q.get('type')
                if q_type == 'multiple_choice' and all(k in q for k in ['question', 'options', 'correctAnswer', 'explanation']) and isinstance(q.get('options'), dict):
                    valid_questions.append(q)
                elif q_type == 'fill_in_the_blank' and all(k in q for k in ['question', 'correctAnswer', 'explanation']):
                    valid_questions.append(q)
            if not valid_questions: raise ValueError(f"AI returned 0 valid questions. Raw response: {response_content}")
            return jsonify(valid_questions)
        else:
            return jsonify(potential_list if potential_list else parsed_json)
    except (json.JSONDecodeError, ValueError) as e:
        app.logger.error(f"Content generation failed for '{topic}': {e}. Response: {response_content if 'response_content' in locals() else 'N/A'}")
        return jsonify({"error": "The AI failed to create content in the correct format. Please try again."}), 500
    except Exception as e:
        app.logger.error(f"An unexpected error occurred generating content for topic '{topic}': {e}", exc_info=True)
        return jsonify({"error": "An unexpected server error occurred."}), 500

@app.route('/api/grade-paper', methods=['POST'])
@login_required
def grade_paper_api():
    if not client: return jsonify({"error": "AI service is not configured."}), 503
    if not WRITING_SAMPLES: return jsonify({"error": "Writing samples are not loaded, cannot grade paper."}), 500
    data = request.json
    grade_level = data.get('grade_level'); paper_type = data.get('paper_type'); paper_text = data.get('paper_text')
    if not all([grade_level, paper_type, paper_text]): return jsonify({"error": "Missing grade level, paper type, or paper text."}), 400
    grade_key = grade_level.replace(" ", "").lower()
    writing_sample = WRITING_SAMPLES.get(grade_key, "No sample available.")
    prompt_template = PROMPTS["paper_grader"]
    system_prompt = prompt_template.format(grade_level=grade_level, paper_type=paper_type, paper_text=paper_text, writing_sample=writing_sample)
    try:
        chat_completion = client.chat.completions.create(messages=[{"role": "system", "content": system_prompt}], model=AI_MODEL, temperature=0.6, response_format={"type": "json_object"})
        response_content = chat_completion.choices[0].message.content
        return jsonify(json.loads(response_content))
    except json.JSONDecodeError as e:
        app.logger.error(f"JSON Decode Error for paper grader: {e}. Response: {response_content}")
        return jsonify({"error": "The AI returned an invalid format. Please try again."}), 500
    except Exception as e:
        app.logger.error(f"Error in paper grader: {e}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred while grading."}), 500

@app.route('/api/upload-pdf', methods=['POST'])
@login_required
def upload_pdf_api():
    if 'pdf-file' not in request.files: return jsonify({"error": "No file part in the request."}), 400
    file = request.files['pdf-file']
    if not file or file.filename == '': return jsonify({"error": "No file selected."}), 400
    if not file.filename.lower().endswith('.pdf'): return jsonify({"error": "Invalid file type. Please upload a PDF file."}), 400
    try:
        pdf_bytes = file.read()
        pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
        full_text = "".join(page.get_text() for page in pdf_document)
        pdf_document.close()
        if not full_text.strip():
            app.logger.warning(f"PDF '{file.filename}' contains no extractable text.")
            return jsonify({"error": "PDF is empty or contains only images."}), 400
        app.logger.info(f"✅ Extracted {len(full_text)} characters from '{file.filename}'.")
        return jsonify({"success": True, "filename": file.filename, "pdf_context": full_text})
    except Exception as e:
        app.logger.error(f"!!! PDF processing failed for '{file.filename}': {e}", exc_info=True)
        return jsonify({"error": "Failed to process the PDF file. It may be corrupt or protected."}), 500

# --- 6. RUN THE APPLICATION ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
