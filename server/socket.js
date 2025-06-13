// server/socket.js
const Message = require('./models/Message');

module.exports = function attachSocket(io) {
  // authenticate each socket using your JWT middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      // your existing logic to verify token and load user
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.userId;
      next();
    } catch (err) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', socket => {
    const me = socket.userId;
    // join a personal room so we can target this user
    socket.join(me);

    // presence broadcast
    io.emit('presence', { userId: me, isOnline: true });

    socket.on('disconnect', () => {
      io.emit('presence', { userId: me, isOnline: false });
    });

    // handle direct‐message events
    socket.on('dm', async ({ to, content }) => {
      // persist
      const msg = await Message.create({
        from: me,
        to,
        content
      });
      await msg.populate('from', 'firstName lastName avatarUrl');

      // send to recipient’s personal room
      io.to(to).emit('dm', msg);
      // echo back to sender so they see it immediately
      socket.emit('dm', msg);
    });
  });
};
