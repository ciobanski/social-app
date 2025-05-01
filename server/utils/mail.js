// server/utils/mail.js
const nodemailer = require('nodemailer');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  })();
  return transporterPromise;
}

/**
 * sendMail({ to, subject, html })
 * Logs an Ethereal preview URL so you can view the email in-browser.
 */
async function sendMail({ to, subject, html }) {
  const transporter = await getTransporter();
  const info = await transporter.sendMail({
    from: '"Social App Dev" <no-reply@ethereal.email>',
    to,
    subject,
    html
  });
  console.log('📨 Preview URL: %s', nodemailer.getTestMessageUrl(info));
}

module.exports = { sendMail };
