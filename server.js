const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allows your Vercel URL to connect
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  // When a user joins a specific room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    
    // Notify others in the room
    socket.to(roomId).emit('notification', 'Someone joined the room');
    socket.to(roomId).emit('user-joined', socket.id);
  });

  // Chat Message Logic
  socket.on('send-message', ({ roomId, message, sender }) => {
    io.to(roomId).emit('receive-message', { 
      message, 
      sender, 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    });
  });

  // WebRTC Signaling (Video/Audio)
  socket.on('offer', (p) => io.to(p.target).emit('offer', p));
  socket.on('answer', (p) => io.to(p.target).emit('answer', p));
  socket.on('ice-candidate', (p) => io.to(p.target).emit('ice-candidate', p));

  socket.on('disconnect', () => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit('notification', 'Someone left the room');
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`MeetSpace Engine running on ${PORT}`));