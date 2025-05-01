// server/test-chat.js
const { io } = require('socket.io-client');

// === PRESET ACCOUNTS ===
const users = {
  alice: {
    id: '6813b342adb76a629d471568',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODEzYjM0MmFkYjc2YTYyOWQ0NzE1NjgiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0NjEyMjUwMiwiZXhwIjoxNzQ2NzI3MzAyfQ.wzHCAKgzIX6jg4_LaZh5DF-dyM32kVmcqjk9TlB_7PA'
  },
  bob: {
    id: '6813711bf39407b2bcdc43a6',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODEzNzExYmYzOTQwN2IyYmNkYzQzYTYiLCJyb2xlIjoidXNlciIsImlhdCI6MTc0NjEyMTYxMSwiZXhwIjoxNzQ2NzI2NDExfQ.TvzM1fM4EE6McP1RyrehBieYtKqR4hd4V3nmPE0vZNQ'
  }
};

// Usage: node test-chat.js alice   OR   node test-chat.js bob
const meName = process.argv[2];
if (!users[meName]) {
  console.error('Usage: node test-chat.js <alice|bob>');
  process.exit(1);
}

const me = users[meName];
const other = meName === 'alice' ? users.bob : users.alice;

// Connect, letting it use the default transports (polling → websocket)
const socket = io('http://localhost:5000', {
  auth: { token: me.token }
});

socket.on('connect', () => {
  console.log(`✅ [${meName}] connected as socket ${socket.id}`);
  // Send a greeting
  socket.emit('dm', {
    to: other.id,
    content: `Hello from ${meName} at ${new Date().toISOString()}`
  });
});

socket.on('connect_error', err => {
  console.error(`❌ [${meName}] Connection error:`, err.message);
});

socket.on('dm', msg => {
  console.log(`💬 [${meName}] DM received:`, msg);
});

socket.on('disconnect', reason => {
  console.log(`🛑 [${meName}] Disconnected:`, reason);
});
