const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, who) {
  const div = document.createElement('div');
  div.className = `message ${who}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, 'user');
  userInput.value = '';
  sendBtn.disabled = true;

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    const data = await res.json();

    if (data.error) {
      addMessage(`Error: ${data.error}`, 'bot');
    } else {
      addMessage(data.response, 'bot');
    }

  } catch (err) {
    addMessage(`Connection failed: ${err.message}`, 'bot');
  }

  sendBtn.disabled = false;
  userInput.focus();
}

// Events
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});