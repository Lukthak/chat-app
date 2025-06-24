const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

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
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'public')));

const interfaces = os.networkInterfaces();
const localIP = Object.values(interfaces)
  .flat()
  .find(details => details.family === 'IPv4' && !details.internal)?.address || 'localhost';

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado');

  db.all('SELECT user, text FROM messages ORDER BY timestamp ASC', (err, rows) => {
    if (!err) {
      socket.emit('previous messages', rows);
    }
  });

  socket.on('new user', (nickname) => {
    connectedUsers.set(socket.id, nickname);
    const systemMsg = `${nickname} se ha unido`;

    db.run('INSERT INTO messages (user, text) VALUES (?, ?)', ['🟢', systemMsg], (err) => {
      if (!err) {
        io.emit('chat message', { user: '🟢', text: systemMsg });
        console.log(`✅ ${systemMsg}`);
      } else {
        console.error('Error guardando mensaje de unión:', err);
      }
    });
  });

  socket.on('chat message', ({ user, text }) => {
    if (text.trim().toUpperCase() === '!CLEAR') {
      console.log(`🧹 !CLEAR detectado por ${user}`);
      db.run('DELETE FROM messages', (err) => {
        if (!err) {
          io.emit('clear chat');
          console.log('🧼 Chat limpiado');
        } else {
          console.error('Error al limpiar:', err);
        }
      });
    } else {
      db.run('INSERT INTO messages (user, text) VALUES (?, ?)', [user, text], (err) => {
        if (!err) {
          io.emit('chat message', { user, text });
        } else {
          console.error('Error guardando mensaje:', err);
        }
      });
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const exitMsg = `${user} se ha retirado`;

      db.run('INSERT INTO messages (user, text) VALUES (?, ?)', ['🔴', exitMsg], (err) => {
        if (!err) {
          io.emit('chat message', { user: '🔴', text: exitMsg });
          console.log(`🔴 ${exitMsg}`);
        } else {
          console.error('Error guardando desconexión:', err);
        }
      });
    }
    connectedUsers.delete(socket.id);
  });
});

server.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://${localIP}:3000`);
});
