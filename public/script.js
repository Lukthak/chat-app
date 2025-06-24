const socket = io();

const chat = document.getElementById('chat');
const input = document.getElementById('message');

let nickname = '';
while (!nickname) {
  nickname = prompt('Ingresa tu nickname:');
}

// Configuración de Web Audio para variar el pitch
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer = null;

// Cargar el archivo de sonido
fetch('/sound.mp3')
  .then((response) => response.arrayBuffer())
  .then((data) => audioContext.decodeAudioData(data))
  .then((buffer) => {
    audioBuffer = buffer;
  })
  .catch((err) => {
    console.error('Error cargando el archivo de sonido:', err);
  });

function playSoundWithRandomPitch() {
  if (!audioBuffer) return;

  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Variar el pitch ligeramente entre 0.95x y 1.05x
  const randomPitch = 0.95 + Math.random() * 0.1;
  source.playbackRate.value = randomPitch;

  source.connect(audioContext.destination);
  source.start();
}

function appendMessage(user, text) {
  const div = document.createElement('div');
  div.textContent = `${user}: ${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

socket.on('previous messages', (messages) => {
  messages.forEach(({ user, text }) => {
    appendMessage(user, text);
  });
});

socket.on('chat message', ({ user, text }) => {
  appendMessage(user, text);

  // Reproducir sonido solo si el mensaje no es del usuario actual
  if (user !== nickname) {
    playSoundWithRandomPitch();
  }
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
