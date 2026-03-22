require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const rooms = {}; // Structure: { roomId: { players: [], isPremium: false } }

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomId, isPremium }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { participants: [], isPremium: isPremium };
    }

    const participantCount = rooms[roomId].participants.length;
    const limit = rooms[roomId].isPremium ? 10 : 2;

    if (participantCount >= limit) {
      socket.emit('error-message', `Room is full. Upgrade to Premium for more slots.`);
      return;
    }

    rooms[roomId].participants.push(socket.id);
    socket.join(roomId);

    // Notify others
    socket.to(roomId).emit('user-joined', socket.id);
    console.log(`User joined ${roomId}. Total: ${rooms[roomId].participants.length}`);
  });

  // WebRTC Signaling Relays
  socket.on('offer', (p) => io.to(p.target).emit('offer', p));
  socket.on('answer', (p) => io.to(p.target).emit('answer', p));
  socket.on('ice-candidate', (p) => io.to(p.target).emit('ice-candidate', p));

  socket.on('disconnect', () => {
    for (const id in rooms) {
      rooms[id].participants = rooms[id].participants.filter(pid => pid !== socket.id);
    }
  });
});

// Stripe $30 Subscription
app.post('/create-premium-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'MeetSpace Pro Plan' },
        unit_amount: 3000, // $30.00
      },
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.CLIENT_URL}/?pay=success`,
    cancel_url: `${process.env.CLIENT_URL}/?pay=cancel`,
  });
  res.json({ id: session.id });
});

server.listen(process.env.PORT || 5000, () => console.log("Server Active"));
