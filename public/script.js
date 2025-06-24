const socket = io();

const chat = document.getElementById('chat');
const input = document.getElementById('message');

let nickname = '';
while (!nickname) {
  nickname = prompt('Ingresa tu nickname:');
}
socket.emit('new user', nickname); // << Notifica al servidor

// Web Audio y sonido
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;

fetch('/sound.mp3')
  .then((res) => res.arrayBuffer())
  .then((data) => audioContext.decodeAudioData(data))
  .then((buffer) => (audioBuffer = buffer))
  .catch((err) => console.error('Error cargando sonido:', err));

function playSoundWithRandomPitch() {
  if (!audioBuffer) return;
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = 0.95 + Math.random() * 0.1;
  source.connect(audioContext.destination);
  source.start();
}

function appendMessage(user, text, system = false) {
  const div = document.createElement('div');
  div.textContent = system ? `✨ ${text}` : `${user}: ${text}`;
  if (system) div.style.color = 'limegreen';
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

socket.on('previous messages', (messages) => {
  messages.forEach(({ user, text }) => appendMessage(user, text));
});

socket.on('chat message', ({ user, text }) => {
  appendMessage(user, text);
  if (user !== nickname) playSoundWithRandomPitch();
});

socket.on('user joined', (user) => {
  appendMessage('', `${user} se ha unido al chat`, true);
});

socket.on('clear chat', () => {
  chat.innerHTML = '';
});

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat message', { user: nickname, text });
  input.value = '';
}

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});
