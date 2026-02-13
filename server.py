from flask import Flask, request, jsonify, send_from_directory
import requests

app = Flask(__name__, static_folder='.', template_folder='.')

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL = "granite3.3:2b"

@app.route('/')
def serve_html():
    return send_from_directory('.', 'index.html')

@app.route('/style.css')
def serve_css():
    return send_from_directory('.', 'style.css')

@app.route('/script.js')
def serve_js():
    return send_from_directory('.', 'script.js')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        user_message = request.json.get('message', '').strip()
        if not user_message:
            return jsonify({"error": "No message"}), 400

        payload = {
            "model": MODEL,
            "messages": [
                {"role": "user", "content": user_message}
            ],
            "stream": False,
            "options": {
                "temperature": 0.7
            }
        }

        r = requests.post(OLLAMA_URL, json=payload, timeout=90)

        if r.status_code != 200:
            return jsonify({
                "error": f"Ollama returned {r.status_code}",
                "detail": r.text
            }), 502

        data = r.json()
        answer = data.get("message", {}).get("content", "No response")

        return jsonify({"response": answer})

    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to Ollama — is it running?"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    print("Starting chatbot server...")
    print("Make sure Ollama is running with:  ollama run granite3.3:2b")
    app.run(host="0.0.0.0", port=5000, debug=True)