// server/utils/mail.js
const nodemailer = require('nodemailer');

// Create a pooled transporter so connections stay alive
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// Verify connection configuration at startup
transporter.verify((err, success) => {
  if (err) {
    console.error('❌ SMTP connection error:', err);
  } else {
    console.log('✅ SMTP transporter is ready');
  }
});

/**
 * sendMail({ to, subject, html })
 * Sends mail via SMTP, always BCC'ing the DEV_EMAIL.
 */
async function sendMail({ to, subject, html }) {
  const msg = {
    from: process.env.EMAIL_FROM,
    to,                              // primary recipient
    bcc: process.env.DEV_EMAIL,  // developer copy
    subject,
    html
  };

  const info = await transporter.sendMail(msg);
  console.log(`📨 Email sent: ${info.messageId} (to ${to}, bcc ${process.env.DEV_EMAIL})`);
}

module.exports = { sendMail };
