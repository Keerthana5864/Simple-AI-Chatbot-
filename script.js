const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');
const clearChatBtn = document.getElementById('clear-chat-btn');
const attachBtn = document.getElementById('attach-btn');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('attachment-preview');

let chatHistory = [];
let attachments = []; // Array of { name, type, data (base64 or text) }

/* ── Persistence ── */
function saveHistory() {
  localStorage.setItem('chat_history', JSON.stringify(chatHistory));
}

function loadHistory() {
  const saved = localStorage.getItem('chat_history');
  if (saved) {
    chatHistory = JSON.parse(saved);
    if (chatHistory.length > 0) {
      const welcome = chatWindow.querySelector('.welcome-msg');
      if (welcome) welcome.remove();
      chatHistory.forEach(msg => renderMessage(msg.text, msg.who, msg.time, msg.web_searched));
    }
  }
}

function renderMessage(text, who, timeStr, webSearched = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${who}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;
  wrapper.appendChild(bubble);

  if (who === 'bot' && webSearched) {
    const badge = document.createElement('span');
    badge.className = 'web-badge';
    badge.textContent = '🌐 Web search';
    wrapper.appendChild(badge);
  }

  const time = document.createElement('span');
  time.className = 'message-time';
  time.textContent = timeStr;
  wrapper.appendChild(time);

  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

/* ── Attachments ── */
attachBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      const base64 = await toBase64(file);
      addAttachment(file.name, 'image', base64);
    } else if (file.name.endsWith('.pdf') || file.type === 'application/pdf') {
      const base64 = await toBase64(file);
      addAttachment(file.name, 'pdf', base64);
    } else {
      const text = await file.text();
      addAttachment(file.name, 'text', text);
    }
  }
  fileInput.value = '';
});

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

function addAttachment(name, type, data) {
  attachments.push({ name, type, data });
  updatePreview();
}

function updatePreview() {
  previewContainer.innerHTML = '';
  if (attachments.length > 0) {
    previewContainer.classList.add('visible');
    attachments.forEach((att, index) => {
      const item = document.createElement('div');
      item.className = 'preview-item';

      if (att.type === 'image') {
        const img = document.createElement('img');
        img.src = `data:image/png;base64,${att.data}`;
        item.appendChild(img);
      } else {
        const icon = document.createElement('div');
        icon.className = 'preview-file-icon';
        icon.innerHTML = att.type === 'pdf' ? '📄' : '📝';
        const nameSpan = document.createElement('div');
        nameSpan.className = 'preview-file-name';
        nameSpan.textContent = att.name;
        icon.appendChild(nameSpan);
        item.appendChild(icon);
      }

      const remove = document.createElement('button');
      remove.className = 'remove-attachment';
      remove.innerHTML = '×';
      remove.onclick = () => {
        attachments.splice(index, 1);
        updatePreview();
      };
      item.appendChild(remove);
      previewContainer.appendChild(item);
    });
  } else {
    previewContainer.classList.remove('visible');
  }
}


/* ── Clear Chat ── */
clearChatBtn.addEventListener('click', () => {
  if (confirm('Clear all chat history?')) {
    localStorage.removeItem('chat_history');
    chatHistory = [];
    chatWindow.innerHTML = `
      <div class="welcome-msg">
        <div class="welcome-icon">✨</div>
        <p>Hello! I'm your AI assistant. Ask me anything!</p>
      </div>
    `;
  }
});

/* ── Helpers ── */
function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function addMessage(text, who, webSearched = false) {
  const timeStr = getTime();
  const welcome = chatWindow.querySelector('.welcome-msg');
  if (welcome) welcome.remove();
  renderMessage(text, who, timeStr, webSearched);
  chatHistory.push({ text, who, time: timeStr, web_searched: webSearched });
  saveHistory();
}

/* ── Typing Indicator ── */
function showTyping() {
  typingIndicator.classList.add('visible');
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTyping() {
  typingIndicator.classList.remove('visible');
}

/* ── Send Message ── */
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text && attachments.length === 0) return;

  if (text) addMessage(text, 'user');
  else addMessage("(Attached Files)", 'user');

  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;
  showTyping();

  const payload = {
    message: text,
    web_search: true,
    images: attachments.filter(a => a.type === 'image').map(a => a.data),
    file_content: attachments.filter(a => a.type !== 'image').map(a => `[File: ${a.name}]\n${a.data}`).join('\n\n')
  };

  attachments = [];
  updatePreview();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    hideTyping();

    if (data.error) {
      addMessage(`⚠️ ${data.error}`, 'bot');
    } else {
      addMessage(data.response, 'bot', data.web_searched);
    }
  } catch (err) {
    hideTyping();
    addMessage(`⚠️ Connection failed: ${err.message}`, 'bot');
  }

  sendBtn.disabled = false;
  userInput.focus();
}

/* ── Events ── */
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/* ── Init ── */
loadHistory();