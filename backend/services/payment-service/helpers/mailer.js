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

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP credentials missing (SMTP_USER/SMTP_PASS)");
  }

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
