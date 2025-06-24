const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = new sqlite3.Database('./chat.db');
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      text TEXT,
      system INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

app.use(express.static(path.join(__dirname, '../public')));

const interfaces = os.networkInterfaces();
const localIP = Object.values(interfaces)
  .flat()
  .find(d => d.family === 'IPv4' && !d.internal)?.address || 'localhost';

const connectedUsers = new Map();

function broadcastUserCount() {
  io.emit('user count', connectedUsers.size);
}

io.on('connection', socket => {
  console.log('🟢 Conexión entrante');

  // 1) Enviar historial
  db.all('SELECT user, text, system FROM messages ORDER BY timestamp ASC', (err, rows) => {
    if (!err) socket.emit('previous messages', rows);
  });

  // 2) Enviar conteo actual al conectar
  socket.emit('user count', connectedUsers.size);

  // 3) Esperar al nickname
  socket.on('new user', nickname => {
    connectedUsers.set(socket.id, nickname);

    const joinText = `${nickname} se ha unido al chat`;
    io.emit('system message', { text: joinText, type: 'join' });
    db.run('INSERT INTO messages (user, text, system) VALUES (?, ?, ?)', [null, joinText, 1]);

    console.log(`✅ ${nickname} se unió`);
    broadcastUserCount();
  });

  // 4) Mensajes de chat
  socket.on('chat message', ({ user, text }) => {
    if (text.trim().toUpperCase() === '!CLEAR') {
      db.run('DELETE FROM messages', () => {
        io.emit('clear chat');
        console.log('🧼 Chat limpiado');
      });
    } else {
      db.run('INSERT INTO messages (user, text) VALUES (?, ?)', [user, text], () => {
        io.emit('chat message', { user, text });
      });
    }
  });

  // 5) Desconexión
  socket.on('disconnect', () => {
    const nickname = connectedUsers.get(socket.id);
    if (nickname) {
      const leaveText = `${nickname} se ha retirado del chat`;
      io.emit('system message', { text: leaveText, type: 'leave' });
      db.run('INSERT INTO messages (user, text, system) VALUES (?, ?, ?)', [null, leaveText, 2]);

      console.log(`🔴 ${nickname} se desconectó`);
      connectedUsers.delete(socket.id);
      broadcastUserCount();
    }
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 Servidor en http://${localIP}:3000`);
});
