// src/utils/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Create the Transporter (The Mailman)
// For Production: Use SendGrid, AWS SES, or Mailgun
// For Dev: Use Gmail or Ethereal
const transporter = nodemailer.createTransport({
  service: 'gmail', // Or 'smtp.ethereal.email'
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Your Gmail APP Password (NOT your login password)
  }
});

exports.sendResultEmail = async (studentEmail, studentName, examTitle, score, maxScore) => {
  const mailOptions = {
    from: `"ExamNexus System" <${process.env.EMAIL_USER}>`,
    to: studentEmail,
    subject: `Exam Results: ${examTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
        <h2>Exam Results Released</h2>
        <p>Dear ${studentName},</p>
        <p>The results for <strong>${examTitle}</strong> have been published.</p>
        
        <div style="background-color: #f4f4f4; padding: 15px; margin: 20px 0;">
          <h3>Your Score: ${score} / ${maxScore}</h3>
        </div>

        <p>Please login to the portal to view the detailed breakdown.</p>
        <p>Regards,<br>ExamNexus Team</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${studentEmail}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${studentEmail}:`, error);
  }
};