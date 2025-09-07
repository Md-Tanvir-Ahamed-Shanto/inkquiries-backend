import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * @desc Send an email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text version of email
 * @param {String} options.html - HTML version of email
 * @returns {Promise<Object>} - Nodemailer info object
 */
export const sendEmail = async (options) => {
  try {
    const { to, subject, text, html } = options;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      throw new Error('Missing required email fields');
    }

    // Set up email options
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || 'Inkquiries'} <${process.env.EMAIL_FROM || 'noreply@inkquiries.com'}>`,
      to,
      subject,
      text,
      html: html || text,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * @desc Send a notification email
 * @param {Object} options - Notification email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.message - Notification message
 * @param {String} options.actionLink - Optional link for call to action
 * @param {String} options.actionText - Optional text for call to action button
 * @returns {Promise<Object>} - Nodemailer info object
 */
export const sendNotificationEmail = async (options) => {
  const { to, subject, message, actionLink, actionText = 'View Details' } = options;

  // Create HTML template
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #000;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: #fff;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #000;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 20px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Inkquiries Notification</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>${message}</p>
          ${actionLink ? `<p><a href="${actionLink}" class="button">${actionText}</a></p>` : ''}
          <p>Thank you for using Inkquiries!</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Inkquiries. All rights reserved.</p>
          <p>If you prefer not to receive these emails, you can update your notification preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Send email
  return await sendEmail({
    to,
    subject,
    text: message,
    html,
  });
};