const socket = io();

const chat = document.getElementById('chat');
const input = document.getElementById('message');
const userCountDiv = document.getElementById('user-count');

let nickname = '';
while (!nickname) {
  nickname = prompt('(̿▀̿ ̿Ĺ̯̿̿▀̿ ̿)̄  - Nickname please');
}

// 1) Registrar listeners ANTES de emitir:
socket.on('previous messages', rows => {
  rows.forEach(({ user, text, system }) => {
    if (system === 1) appendMsg('', text, 'system-message');
    else if (system === 2) appendMsg('', text, 'user-left');
    else appendMsg(user, text);
  });
});

socket.on('chat message', ({ user, text }) => {
  appendMsg(user, text);
  if (user !== nickname) playSound();
});

socket.on('system message', ({ text, type }) => {
  if (type === 'join') appendMsg('', text, 'system-message');
  else appendMsg('', text, 'user-left');
});

socket.on('clear chat', () => {
  chat.innerHTML = '';
});

socket.on('user count', count => {
  userCountDiv.textContent = ` ${count}${count !== 1 ? 's' : ''}`;
});

// 2) Emitir NUEVO USUARIO solo después:
socket.emit('new user', nickname);

// 3) Funciones auxiliares:

// Sonido
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;
fetch('/sound.mp3')
  .then(r => r.arrayBuffer())
  .then(d => audioCtx.decodeAudioData(d))
  .then(b => audioBuffer = b)
  .catch(() => {});

function playSound() {
  if (!audioBuffer) return;
  const src = audioCtx.createBufferSource();
  src.buffer = audioBuffer;
  src.playbackRate.value = 0.95 + Math.random() * 0.1;
  src.connect(audioCtx.destination);
  src.start();
}

function appendMsg(user, text, cls = '') {
  const div = document.createElement('div');
  div.textContent = user ? `${user}: ${text}` : text;
  if (cls) div.className = cls;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

// Enviar mensaje con Enter
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const txt = input.value.trim();
    if (txt) {
      socket.emit('chat message', { user: nickname, text: txt });
      input.value = '';
    }
  }
});
