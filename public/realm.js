const socket = io();
const canvas = document.getElementById('realm');
const ctx = canvas.getContext('2d');

let players = {};
let myId = null;
const position = { x: 50 + Math.random() * 500, y: 50 + Math.random() * 300 };
const speed = 5;
let myName = localStorage.getItem('nickname') || 'Anonymous';

// Join when connected
socket.on('connect', () => {
  myId = socket.id;
  socket.emit('realm join', { x: position.x, y: position.y, name: myName });
});

// Receive state
socket.on('realm state', state => {
  players = state;
  draw();
});

// Draw players
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const id in players) {
    const p = players[id];

    // Draw player square
    ctx.fillStyle = id === myId ? '#9a0000' : '#888';
    ctx.fillRect(p.x, p.y, 20, 20);

    // Draw speech bubble (if any)
    if (p.bubble && Date.now() - p.bubbleTime < 4000) {
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#000';
      ctx.fillText(`(${p.bubble}`, p.x + 10, p.y - 5);
;
    }

    // Draw nickname below the square
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(p.name, p.x + 10, p.y + 35);
    ctx.fillStyle = '#000';
    ctx.fillText(p.name, p.x + 10, p.y + 35);
  }
}

// Movement
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

// Chat bubble input
const input = document.getElementById('realm-input');
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const msg = input.value.trim();
    if (msg) {
      socket.emit('realm bubble', msg);
      input.value = '';
    }
  }
});
