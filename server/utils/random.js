const crypto = require('crypto');
exports.randomHex = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
