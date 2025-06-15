// index.js

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

// Passport config (Google OAuth, etc)
require('./config/passport');

// Models
const User = require('./models/User');
const Message = require('./models/Message');

// API routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
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
const trendingRoutes = require('./routes/trending');
const storiesRoutes = require('./routes/stories');
const friendsRoutes = require('./routes/friends');
const presenceRoutes = require('./routes/presence');
const notificationsRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// Share io & online-users set with routes if needed
app.set('io', io);
const onlineUsers = new Set();
app.set('onlineUsers', onlineUsers);

// ── MIDDLEWARE ──────────────────────────────────────────────────

// CORS + cookies
const localhostRegex = /^http:\/\/localhost:\d+$/;
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || localhostRegex.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── ADMIN SEEDING ────────────────────────────────────────────────
async function ensureAdminUser() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const parts = (ADMIN_NAME || 'Admin').trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || 'Administrator';
  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  let admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    Object.assign(admin, { firstName, lastName, passwordHash, isVerified: true, role: 'admin' });
    await admin.save();
    console.log(`🔐 Admin updated: ${admin.email}`);
  } else {
    admin = await User.create({ firstName, lastName, email: ADMIN_EMAIL, passwordHash, isVerified: true, role: 'admin' });
    console.log(`🔐 Admin created: ${admin.email}`);
  }
}

// ── DB CONNECTION ────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdminUser();
  })
  .catch(err => console.error('❌ MongoDB error:', err));

// ── REST ROUTES ─────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api', likeRoutes);       // e.g. POST /api/posts/:id/like
app.use('/api', saveRoutes);       // e.g. POST /api/posts/:id/save
app.use('/api/hashtags', hashtagRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/trending', trendingRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/', (req, res) => res.send('API is running'));

// ── SOCKET.IO ───────────────────────────────────────────────────
// Authenticate handshake via JWT stored in authToken cookie or passed in auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.match(/authToken=([^;]+)/)?.[1];
  if (!token) return next(new Error('Auth token missing'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId.toString();
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async socket => {
  const uid = socket.userId;
  onlineUsers.add(uid);
  socket.join(uid);

  // broadcast presence to your friends list
  const me = await User.findById(uid, 'friends').lean();
  me.friends.forEach(fid => {
    io.to(fid.toString()).emit('presence', { userId: uid, isOnline: true });
  });

  // DM receive/save/broadcast
  socket.on('dm', async ({ to, content }) => {
    try {
      const msg = await Message.create({ from: uid, to, content });
      await msg.populate('from', 'firstName lastName avatarUrl');
      socket.emit('dm', msg);        // echo to sender
      io.to(to).emit('dm', msg);     // send to recipient
    } catch (err) {
      console.error('🛑 DM error:', err);
    }
  });

  socket.on('disconnect', async () => {
    onlineUsers.delete(uid);
    await User.findByIdAndUpdate(uid, { lastSeen: new Date() });
    me.friends.forEach(fid => {
      io.to(fid.toString()).emit('presence', { userId: uid, isOnline: false });
    });
  });
});

// ── START SERVER ────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Listening on port ${PORT}`);
});
