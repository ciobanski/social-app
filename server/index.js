require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./config/passport'); // Google OAuth

// Models
const User = require('./models/User');
const Message = require('./models/Message');

// Routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const trendingRoutes = require('./routes/trending');
const commentRoutes = require('./routes/comments');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/users');
const likeRoutes = require('./routes/likes');
const saveRoutes = require('./routes/saves');
const hashtagRoutes = require('./routes/hashtags');
const messageRoutes = require('./routes/messages');
const shareRoutes = require('./routes/shares');
const searchRoutes = require('./routes/search');
const storiesRoutes = require('./routes/stories');
const friendsRoutes = require('./routes/friends');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });
// **Expose io to routes via req.app**
app.set('io', io);

// ── Global Middleware ─────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Admin Seeding ─────────────────────────────────────────────────────────────
async function ensureAdminUser() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) return; // already there

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await User.create({
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin'
  });
  console.log(`🔐 Admin user created: ${admin.email}`);
}

// ── Database Connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdminUser();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── REST Route Mounting ───────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api', likeRoutes);
app.use('/api', saveRoutes);
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/friends', friendsRoutes);
// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('API is up and running!'));

// ── Socket.io Authentication ─────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth token missing'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ── Socket.io Connection & Events ─────────────────────────────────────────────
io.on('connection', socket => {
  // Join a private room for this user
  socket.join(socket.userId);

  // Handle direct messages
  socket.on('dm', async ({ to, content }) => {
    // Persist the message
    const msg = await Message.create({
      from: socket.userId,
      to,
      content
    });
    // Populate sender info
    await msg.populate('from', 'name avatarUrl');

    // Emit the message to both sender & recipient
    io.to(to).emit('dm', msg);
    io.to(socket.userId).emit('dm', msg);
  });

  socket.on('disconnect', () => {
    // You can handle cleanup here if needed
  });
});

// ── Server Startup ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
