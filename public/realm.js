const socket = io();
const canvas = document.getElementById('realm');
const ctx = canvas.getContext('2d');

let players = {};
let myId = null;

const position = { x: 50 + Math.random() * 500, y: 50 + Math.random() * 300 };
const speed = 5;

socket.on('connect', () => {
  myId = socket.id;
  socket.emit('realm join', { x: position.x, y: position.y });
});

socket.on('realm state', state => {
  players = state;
  draw();
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const id in players) {
    const p = players[id];
    ctx.fillStyle = id === myId ? '#9a0000' : '#888';
    ctx.fillRect(p.x, p.y, 20, 20);
  }
}

document.addEventListener('keydown', e => {
  let moved = false;
  if (e.key === 'ArrowUp')    { position.y -= speed; moved = true; }
  if (e.key === 'ArrowDown')  { position.y += speed; moved = true; }
  if (e.key === 'ArrowLeft')  { position.x -= speed; moved = true; }
  if (e.key === 'ArrowRight') { position.x += speed; moved = true; }

  if (moved) {
    socket.emit('realm move', { x: position.x, y: position.y });
  }
});


// === backend/index.js (agregar al final de io.on('connection', socket => {...})) ===
const realmPlayers = {};

socket.on('realm join', ({ id, x, y }) => {
  realmPlayers[id] = { x, y };
  io.emit('realm state', realmPlayers);
});

socket.on('realm move', ({ id, x, y }) => {
  if (realmPlayers[id]) {
    realmPlayers[id].x = x;
    realmPlayers[id].y = y;
    io.emit('realm state', realmPlayers);
  }
});

socket.on('disconnect', () => {
  delete realmPlayers[socket.id];
  io.emit('realm state', realmPlayers);
});
