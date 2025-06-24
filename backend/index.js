const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

const interfaces = os.networkInterfaces();
const localIP = Object.values(interfaces)
  .flat()
  .find(d => d.family === 'IPv4' && !d.internal)?.address || 'localhost';

const connectedUsers = new Map();
const messages = []; // 🔥 Mensajes solo en memoria

function broadcastUserCount() {
  io.emit('user count', connectedUsers.size);
}

io.on('connection', socket => {
  console.log('🟢 Conexión entrante');

  // 1) Enviar historial
  socket.emit('previous messages', messages);

  // 2) Enviar conteo actual
  socket.emit('user count', connectedUsers.size);

  // 3) Nuevo usuario
  socket.on('new user', nickname => {
    connectedUsers.set(socket.id, nickname);

    const joinText = `${nickname} se ha unido al chat`;
    const msg = { user: null, text: joinText, system: 1 };
    messages.push(msg);
    io.emit('system message', { text: joinText, type: 'join' });

    console.log(`✅ ${nickname} se unió`);
    broadcastUserCount();
  });

  // 4) Mensaje de chat
  socket.on('chat message', ({ user, text }) => {
    if (text.trim().toUpperCase() === '!CLEAR') {
      messages.length = 0; // borra todos
      io.emit('clear chat');
      console.log('🧼 Chat limpiado');
    } else {
      const msg = { user, text };
      messages.push(msg);
      io.emit('chat message', msg);
    }
  });

  // 5) Usuario se va
  socket.on('disconnect', () => {
    const nickname = connectedUsers.get(socket.id);
    if (nickname) {
      const leaveText = `${nickname} se ha retirado del chat`;
      const msg = { user: null, text: leaveText, system: 2 };
      messages.push(msg);
      io.emit('system message', { text: leaveText, type: 'leave' });

      console.log(`🔴 ${nickname} se desconectó`);
      connectedUsers.delete(socket.id);
      broadcastUserCount();
    }
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://${localIP}:3000`);
});
