const nodemailer = require('nodemailer');
const config = require('../config');

/**
 * Send an email with optional attachments
 * @param {Object} options - { to, subject, text, html, attachments }
 */
async function sendMail(options) {
  if (!config.mail.host || !config.mail.auth.user) {
    console.warn('Mail skipped: SMTP not configured');
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: {
        user: config.mail.auth.user,
        pass: config.mail.auth.pass,
      },
    });

    const info = await transporter.sendMail({
      from: config.mail.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
    });

    console.log('Message sent: %s', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Mail Error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendMail };
