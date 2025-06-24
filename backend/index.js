const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const db = new sqlite3.Database('./chat.db');

// Crear tabla si no existe
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

// Servir archivos estáticos del frontend
app.use(express.static('../public'));

// Obtener IP local
const interfaces = os.networkInterfaces();
const localIP = Object.values(interfaces)
  .flat()
  .find(details => details.family === 'IPv4' && !details.internal)?.address || 'localhost';

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado');

  // Enviar historial al nuevo usuario
  db.all('SELECT user, text FROM messages ORDER BY timestamp ASC', (err, rows) => {
    if (!err) {
      socket.emit('previous messages', rows);
    }
  });

  // Recibir nuevo usuario
  socket.on('new user', (nickname) => {
    connectedUsers.set(socket.id, nickname);
    io.emit('user joined', nickname); // Anuncio global
    console.log(`✅ ${nickname} se ha unido`);
  });

  // Recibir y guardar mensaje
  socket.on('chat message', ({ user, text }) => {
    if (text.trim().toUpperCase() === '!CLEAR') {
      console.log(`🧹 !CLEAR detectado por ${user}`);
      db.run('DELETE FROM messages', (err) => {
        if (!err) {
          io.emit('clear chat');
          console.log('🧼 Chat limpiado');
        } else {
          console.error('Error limpiando chat:', err);
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

  // Usuario desconectado
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      io.emit('user left', user); // Anuncio global de salida
      console.log(`🔴 ${user} se ha desconectado`);
    } else {
      console.log('🔴 Usuario anónimo desconectado');
    }
    connectedUsers.delete(socket.id);
  });
});

// Escuchar en todas las interfaces (localhost y red local)
server.listen(3000, '0.0.0.0', () => {
  console.log(`🚀 Servidor escuchando en http://${localIP}:3000`);
});
