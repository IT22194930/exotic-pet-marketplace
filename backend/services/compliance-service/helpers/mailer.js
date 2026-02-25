const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER;

/**
 * Send a plain-text + HTML email.
 * @param {object} opts
 * @param {string}   opts.to       - Recipient email address
 * @param {string}   opts.subject  - Email subject
 * @param {string}   opts.text     - Plain-text body
 * @param {string}  [opts.html]    - HTML body (optional, falls back to text)
 */
async function sendMail({ to, subject, text, html }) {
  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    text,
    html: html || `<pre>${text}</pre>`,
  });
  return info.messageId;
}

module.exports = { sendMail };
