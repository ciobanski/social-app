// index.js  (or your entry-point file)

require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const cookieParser = require('cookie-parser');
require('./config/passport'); // Google OAuth setup

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
const presenceRoutes = require('./routes/presence');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

// Expose io and presence set to routes if needed
app.set('io', io);
const onlineUsers = new Set();
app.set('onlineUsers', onlineUsers);

// ── Global Middleware ─────────────────────────────────────────
// Allow any http://localhost:<port> origin
const localhostRegex = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (localhostRegex.test(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Admin Seeding ───────────────────────────────────────────────
async function ensureAdminUser() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  // Split ADMIN_NAME into firstName / lastName, with a default lastName
  const parts = (ADMIN_NAME || 'Admin').trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : 'Administrator';

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    // Patch missing name fields and update password & flags
    existing.firstName = firstName;
    existing.lastName = lastName;
    existing.passwordHash = passwordHash;
    existing.isVerified = true;
    existing.role = 'admin';
    await existing.save();
    console.log(`🔐 Admin user updated: ${existing.email}`);
    return;
  }

  // Create a brand-new, fully populated admin user
  const admin = await User.create({
    firstName,
    lastName,
    email: ADMIN_EMAIL,
    passwordHash,
    role: 'admin',
    isVerified: true
  });
  console.log(`🔐 Admin user created: ${admin.email}`);
}


// ── Database Connection ─────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB connected');
    await ensureAdminUser();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ── REST Route Mounting ─────────────────────────────────────────
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
app.use('/api/presence', presenceRoutes);

// ── Health Check ───────────────────────────────────────────────
app.get('/', (req, res) => res.send('API is up and running!'));

// ── Socket.io Authentication ───────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth token missing'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId.toString();
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

// ── Socket.io Connection & Presence Events ──────────────────────
io.on('connection', async socket => {
  const uid = socket.userId;
  onlineUsers.add(uid);
  socket.join(uid);

  // Notify friends that this user is online
  const me = await User.findById(uid, 'friends').lean();
  for (let fid of me.friends) {
    io.to(fid.toString()).emit('presence', { userId: uid, isOnline: true });
  }

  socket.on('disconnect', async () => {
    onlineUsers.delete(uid);
    // Update lastSeen for this user
    await User.findByIdAndUpdate(uid, { lastSeen: new Date() });
    // Notify friends that this user is offline
    for (let fid of me.friends) {
      io.to(fid.toString()).emit('presence', { userId: uid, isOnline: false });
    }
  });

  // your existing DM, notification events...
});

// ── Server Startup ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
