const nodemailer = require("nodemailer");
require("dotenv").config();

const EAZY_LOGO_URL = "https://www.eazymarkets.com/assets/logo-CRbKH6CN.webp";

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

async function sendEmail(to, subject, html, attachments = []) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"EazyMarkets Verification Team" <${process.env.NODE_EAZY_VERIFICATION_EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments,
    });
  } catch (error) {
    console.error("Error sending email:", error.message);
    throw new Error("Email sending failed.");
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getVerificationSubmittedEmailHtml(user = {}) {
  const firstName = user.first_name || user.firstName || "";
  const surname = user.surname || "";
  const fullName = `${firstName} ${surname}`.trim();
  const displayName = escapeHtml(fullName || "Customer");
  const currentYear = new Date().getFullYear();

  return `
<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verification Submitted Successfully</title>
  </head>

  <body style="margin:0; padding:0; background:#f8fbf4;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fbf4;">
      <tr>
        <td align="center" style="padding:28px 12px;">

          <table width="640" cellpadding="0" cellspacing="0" role="presentation" style="width:100%; max-width:640px;">

            <!-- Logo -->
            <tr>
              <td align="center" style="padding-bottom:18px;">
                <img
                  src="${EAZY_LOGO_URL}"
                  alt="EazyMarkets"
                  height="54"
                  style="display:block; margin:0 auto; max-width:220px; height:auto;"
                />
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background:#ffffff; border:1px solid #d9e7cf; border-radius:18px; overflow:hidden;">

                <!-- Accent Bar -->
                <div style="height:7px; background:#7ed957;"></div>

                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="
                      padding:30px 26px 28px;
                      font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                      color:#1f2937;
                    ">

                      <!-- Status Badge -->
                      <div style="text-align:center; margin-bottom:18px;">
                        <span style="
                          display:inline-block;
                          padding:8px 14px;
                          border-radius:999px;
                          background:#f8fbf4;
                          border:1px solid #d9e7cf;
                          color:#4f8f2f;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.04em;
                          text-transform:uppercase;
                        ">
                          Submission Received
                        </span>
                      </div>

                      <!-- Title -->
                      <h1 style="
                        margin:0 0 14px;
                        font-size:24px;
                        line-height:1.3;
                        font-weight:800;
                        text-align:center;
                        color:#1f2937;
                      ">
                        Verification Submitted Successfully
                      </h1>

                      <!-- Intro -->
                      <p style="
                        margin:0 0 20px;
                        font-size:15px;
                        line-height:1.7;
                        color:#4b5563;
                        text-align:center;
                      ">
                        Hi ${displayName}, your verification information has been submitted successfully.
                      </p>

                      <!-- Info Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="
                        margin:22px 0;
                        background:#f8fbf4;
                        border:1px solid #d9e7cf;
                        border-radius:14px;
                      ">
                        <tr>
                          <td style="padding:18px 18px;">
                            <p style="
                              margin:0 0 10px;
                              font-size:14px;
                              line-height:1.7;
                              color:#1f2937;
                              font-weight:700;
                            ">
                              What happens next?
                            </p>

                            <p style="
                              margin:0;
                              font-size:14px;
                              line-height:1.7;
                              color:#4b5563;
                            ">
                              Our verification team will review your submitted information and documents.
                              If any additional information is required, your account manager will contact you.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Steps -->
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:18px;">
                        <tr>
                          <td style="padding:0 0 10px;">
                            <p style="
                              margin:0;
                              font-size:13px;
                              line-height:1.6;
                              color:#1f2937;
                              font-weight:700;
                            ">
                              Submission status:
                            </p>
                          </td>
                        </tr>

                        <tr>
                          <td style="padding:0;">
                            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                              <tr>
                                <td width="28" valign="top" style="padding:3px 0 0;">
                                  <span style="
                                    display:inline-block;
                                    width:18px;
                                    height:18px;
                                    border-radius:999px;
                                    background:#7ed957;
                                    color:#ffffff;
                                    text-align:center;
                                    line-height:18px;
                                    font-size:12px;
                                    font-weight:700;
                                  ">
                                    ✓
                                  </span>
                                </td>
                                <td style="padding:0 0 12px;">
                                  <p style="
                                    margin:0;
                                    font-size:13px;
                                    line-height:1.6;
                                    color:#4b5563;
                                  ">
                                    Your verification form and documents have been received.
                                  </p>
                                </td>
                              </tr>

                              <tr>
                                <td width="28" valign="top" style="padding:3px 0 0;">
                                  <span style="
                                    display:inline-block;
                                    width:18px;
                                    height:18px;
                                    border-radius:999px;
                                    background:#4f8f2f;
                                    color:#ffffff;
                                    text-align:center;
                                    line-height:18px;
                                    font-size:12px;
                                    font-weight:700;
                                  ">
                                    2
                                  </span>
                                </td>
                                <td style="padding:0 0 12px;">
                                  <p style="
                                    margin:0;
                                    font-size:13px;
                                    line-height:1.6;
                                    color:#4b5563;
                                  ">
                                    The EazyMarkets team will review your details.
                                  </p>
                                </td>
                              </tr>

                              <tr>
                                <td width="28" valign="top" style="padding:3px 0 0;">
                                  <span style="
                                    display:inline-block;
                                    width:18px;
                                    height:18px;
                                    border-radius:999px;
                                    background:#d9e7cf;
                                    color:#1f2937;
                                    text-align:center;
                                    line-height:18px;
                                    font-size:12px;
                                    font-weight:700;
                                  ">
                                    3
                                  </span>
                                </td>
                                <td style="padding:0;">
                                  <p style="
                                    margin:0;
                                    font-size:13px;
                                    line-height:1.6;
                                    color:#4b5563;
                                  ">
                                    You will be updated once your verification has been processed.
                                  </p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Support -->
                      <p style="
                        margin:24px 0 0;
                        font-size:14px;
                        line-height:1.7;
                        color:#4b5563;
                      ">
                        If you need any assistance, please contact your account manager.
                      </p>

                      <p style="
                        margin:18px 0 0;
                        font-size:14px;
                        line-height:1.7;
                        color:#1f2937;
                        font-weight:700;
                      ">
                        Thank you,<br />
                        EazyMarkets Verification Team
                      </p>

                      <!-- Automated Notice -->
                      <div style="
                        margin-top:24px;
                        padding-top:18px;
                        border-top:1px solid #d9e7cf;
                      ">
                        <p style="
                          margin:0;
                          font-size:12px;
                          line-height:1.6;
                          color:#8a9584;
                          text-align:center;
                        ">
                          This is an automated confirmation email. Please do not reply to this email.
                        </p>
                      </div>

                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="
                padding-top:16px;
                font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
                font-size:12px;
                line-height:1.6;
                color:#8a9584;
              ">
                © ${currentYear} EazyMarkets. All rights reserved.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </body>
</html>
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
