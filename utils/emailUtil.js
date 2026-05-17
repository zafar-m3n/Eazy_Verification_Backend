const nodemailer = require("nodemailer");
require("dotenv").config();

function getTransporter() {
  const smtpHost = process.env.NODE_EAZY_VERIFICATION_EMAIL_HOST;
  const smtpPort = Number(process.env.NODE_EAZY_VERIFICATION_EMAIL_PORT || 465);
  const smtpUser = process.env.NODE_EAZY_VERIFICATION_EMAIL_USER;
  const smtpPass = process.env.NODE_EAZY_VERIFICATION_EMAIL_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP configuration is missing.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

async function sendEmail(to, subject, html) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Eazy Verification" <${process.env.NODE_EAZY_VERIFICATION_EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Email sending failed.");
  }
}

function getVerificationSubmittedEmailHtml(user = {}) {
  const firstName = user.first_name || user.firstName || "";
  const surname = user.surname || "";
  const fullName = `${firstName} ${surname}`.trim();

  return `
    <div style="font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 24px; border-radius: 8px;">
        <h2 style="margin-top: 0; color: #222222;">Verification Submitted Successfully</h2>

        <p style="color: #333333; font-size: 15px; line-height: 1.6;">
          Dear ${fullName || "Customer"},
        </p>

        <p style="color: #333333; font-size: 15px; line-height: 1.6;">
          Your verification information has been submitted successfully.
        </p>

        <p style="color: #333333; font-size: 15px; line-height: 1.6;">
          Our team will review your submitted information. If you need any assistance, please contact your account manager.
        </p>

        <p style="color: #333333; font-size: 15px; line-height: 1.6;">
          Thank you.
        </p>

        <p style="color: #777777; font-size: 13px; line-height: 1.6; margin-top: 24px;">
          This is an automated confirmation email. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;
}

async function sendVerificationSubmittedEmail(user) {
  if (!user || !user.email) {
    throw new Error("Customer email is required.");
  }

  const subject = "Verification Information Submitted Successfully";
  const html = getVerificationSubmittedEmailHtml(user);

  return sendEmail(user.email, subject, html);
}

module.exports = {
  sendEmail,
  getVerificationSubmittedEmailHtml,
  sendVerificationSubmittedEmail,
};
