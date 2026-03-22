const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const users = {};

io.on('connection', (socket) => {
    socket.on('join-room', (roomId) => {
        if (!users[roomId]) users[roomId] = [];
        users[roomId].push(socket.id);
        socket.join(roomId);
        const otherUser = users[roomId].find(id => id !== socket.id);
        if (otherUser) {
            socket.emit("other-user", otherUser);
            socket.to(otherUser).emit("user-joined", socket.id);
        }
    });
    socket.on("offer", p => io.to(p.target).emit("offer", p));
    socket.on("answer", p => io.to(p.target).emit("answer", p));
    socket.on("ice-candidate", p => io.to(p.target).emit("ice-candidate", p));
    socket.on('disconnect', () => {
        for (const r in users) users[r] = users[r].filter(id => id !== socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));
