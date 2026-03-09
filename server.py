from flask import Flask, request, jsonify, send_from_directory
import requests
import fitz  # PyMuPDF
import base64
import io
from duckduckgo_search import DDGS

app = Flask(__name__, static_folder='.', template_folder='.')

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
TEXT_MODEL = "granite3.3:2b"
VISION_MODEL = "llava"

@app.route('/')
def serve_html():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def serve_css():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory('.', 'script.js')

@app.route('/logo.png')
def serve_logo():
    return send_from_directory('.', 'logo.png')

def web_search(query, max_results=4):
    """Search DuckDuckGo and return top results as a formatted string."""
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        if not results:
            return None
        formatted = ""
        for i, r in enumerate(results, 1):
            formatted += f"[{i}] {r.get('title', '')}\n{r.get('body', '')}\nSource: {r.get('href', '')}\n\n"
        return formatted.strip()
    except Exception as e:
        return None

def parse_pdf(file_bytes):
    """Extract text from PDF bytes."""
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        return text.strip()
    except Exception as e:
        return f"[Error parsing PDF: {str(e)}]"

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '').strip()
        images = data.get('images', [])  # List of base64 strings
        file_content = data.get('file_content', '')

        if not user_message and not images:
            return jsonify({"error": "No message or image provided"}), 400

        # Decide which model to use
        current_model = VISION_MODEL if images else TEXT_MODEL

        # --- Smart Search & Persona Logic ---
        # Keywords that suggest a conversational or identity question (no search needed)
        conversational_keywords = [
            "who are you", "what are you", "your name", "doing",
            "hello", "hi ", "hey", "how are you", "thank", "bye"
        ]
        
        is_conversational = any(k in user_message.lower() for k in conversational_keywords)
        should_search = not images and not is_conversational

        system_content = (
            "You are a helpful, conversational AI Assistant. "
            "Your tone is friendly, professional, and concise, similar to ChatGPT. "
            "If the user asks who you are or what you are doing, answer naturally as an AI without searching the web."
        )
        
        # Add file content if present
        if file_content:
            user_message = f"Context from attached file:\n{file_content}\n\nUser Question: {user_message}"

        # Perform web search ONLY if it's not a simple conversational query
        web_searched = False
        if should_search:
            search_results = web_search(user_message)
            if search_results:
                web_searched = True
                system_content = (
                    "You are a helpful AI assistant with access to real-time web search results. "
                    "Use the following search results to answer accurately. "
                    "Be conversational and cite sources if needed.\n\n"
                    f"Web Search Results:\n{search_results}"
                )

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_message}
        ]

        payload = {
            "model": current_model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7
            }
        }

        # Add images to the last message if vision model is used
        if images:
            payload["messages"][-1]["images"] = images

        r = requests.post(OLLAMA_URL, json=payload, timeout=120)

        if r.status_code != 200:
            return jsonify({
                "error": f"Ollama returned {r.status_code}",
                "detail": r.text
            }), 502

        resp_data = r.json()
        answer = resp_data.get("message", {}).get("content", "No response")

        return jsonify({
            "response": answer,
            "web_searched": web_searched
        })

    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama — is it running?"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Starting chatbot server...")
    print(f"Text Model: {TEXT_MODEL}")
    print(f"Vision Model: {VISION_MODEL} (requires 'ollama pull llava')")
    app.run(host="0.0.0.0", port=5000, debug=True)