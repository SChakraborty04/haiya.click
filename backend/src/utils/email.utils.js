import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.example.com",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const getVerificationTemplate = (name, token) => {
  const verificationUrl = `${process.env.EMAIL_URL}/verify-email?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Space Mono', 'Courier New', Courier, monospace; color: #f5f5f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="border: 1px solid #27272a; background-color: #0a0a0a; box-shadow: 0 0 40px rgba(220, 38, 38, 0.1);">
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 0 20px 0; border-bottom: 1px solid #27272a;">
                  <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.3em; color: #f5f5f5; text-transform: uppercase;">
                    HAIYA<span style="color: #dc2626;">.</span>CLICK
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 50px;">
                  <div style="font-size: 10px; color: #dc2626; letter-spacing: 0.25em; margin-bottom: 16px; text-align: center;">[ AUTHENTICATION REQUIRED ]</div>
                  
                  <h2 style="margin: 0 0 24px 0; font-size: 20px; color: #f5f5f5; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">
                    Verify Your Account
                  </h2>
                  
                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.8; color: #a1a1aa; text-align: center;">
                    Hello ${name},<br>
                    Welcome to the system. To finalize your registration and begin creating real-time polls, please verify your email address.
                  </p>
                  
                  <div align="center" style="padding: 20px 0;">
                    <!--[if mso]>
                      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${verificationUrl}" style="height:50px;v-text-anchor:middle;width:250px;" arcsize="0%" strokecolor="#dc2626" fillcolor="#dc2626">
                        <w:anchorlock/>
                        <center style="color:#ffffff;font-family:sans-serif;font-size:13px;font-weight:bold;">VERIFY EMAIL ADDRESS</center>
                      </v:roundrect>
                    <![endif]-->
                    <a href="${verificationUrl}" style="background-color: #dc2626; border: 1px solid #dc2626; color: #ffffff; display: inline-block; font-size: 12px; font-weight: bold; letter-spacing: 0.2em; line-height: 50px; text-align: center; text-decoration: none; width: 250px; -webkit-text-size-adjust: none; mso-hide: all;">VERIFY EMAIL ADDRESS</a>
                  </div>
                  
                  <p style="margin: 20px 0 0 0; font-size: 11px; line-height: 1.6; color: #52525b; text-align: center;">
                    If you didn't create an account on HAIYA.CLICK, you can safely ignore this email.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px; border-top: 1px solid #27272a; background-color: rgba(255,255,255,0.02);">
                  <p style="margin: 0; font-size: 10px; color: #71717a; letter-spacing: 0.1em; text-transform: uppercase;">
                    &copy; 2026 HAIYA.CLICK | SECURE POLLING SYSTEM
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendMail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `HAIYA.CLICK <${process.env.SMTP_FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

const sendVerificationEmail = async (email, name, token) => {
  const html = getVerificationTemplate(name, token);
  await transporter.sendMail({
    from: `HAIYA.CLICK <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: "Verify Your Email - HAIYA.CLICK",
    html,
  });
};

const getPollResultsTemplate = (name, pollTitle, totalVoters, dashboardUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Poll Results - HAIYA.CLICK</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono&display=swap');
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Space Mono', 'Courier New', Courier, monospace; color: #f5f5f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0a0a0a;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table border="0" cellpadding="0" cellspacing="0" width="600" style="border: 1px solid #22c55e44; background-color: #0a0a0a; box-shadow: 0 0 40px rgba(34,197,94,0.08);">
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 40px 0 20px 0; border-bottom: 1px solid #27272a;">
                  <h1 style="margin: 0; font-size: 24px; letter-spacing: 0.3em; color: #f5f5f5; text-transform: uppercase;">
                    HAIYA<span style="color: #dc2626;">.</span>CLICK
                  </h1>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding: 40px 50px;">
                  <div style="font-size: 10px; color: #22c55e; letter-spacing: 0.25em; margin-bottom: 16px; text-align: center;">[ POLL CLOSED — RESULTS READY ]</div>

                  <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #f5f5f5; text-align: center; letter-spacing: 0.05em; text-transform: uppercase;">
                    Poll Completed
                  </h2>
                  <p style="margin: 0 0 28px 0; font-size: 12px; color: #a1a1aa; text-align: center; letter-spacing: 0.1em; text-transform: uppercase;">${pollTitle}</p>

                  <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.8; color: #a1a1aa; text-align: center;">
                    Hello ${name},<br>
                    Your poll has automatically closed and the results have been published.
                  </p>

                  <!-- Stats box -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #27272a; background-color: rgba(255,255,255,0.02); margin: 0 0 28px 0;">
                    <tr>
                      <td align="center" style="padding: 28px;">
                        <p style="margin: 0 0 8px 0; font-size: 10px; color: #a1a1aa; letter-spacing: 0.2em; text-transform: uppercase;">TOTAL PARTICIPANTS</p>
                        <p style="margin: 0; font-size: 48px; color: #22c55e; letter-spacing: 0.05em;">${totalVoters}</p>
                        <p style="margin: 8px 0 0 0; font-size: 11px; color: #71717a; letter-spacing: 0.1em;">unique vote${totalVoters !== 1 ? 's' : ''} recorded</p>
                      </td>
                    </tr>
                  </table>

                  <div align="center" style="padding: 10px 0 20px 0;">
                    <a href="${dashboardUrl}" style="background-color: #22c55e; border: 1px solid #22c55e; color: #000000; display: inline-block; font-size: 12px; font-weight: bold; letter-spacing: 0.2em; line-height: 50px; text-align: center; text-decoration: none; width: 280px; -webkit-text-size-adjust: none;">
                      VIEW FULL RESULTS →
                    </a>
                  </div>

                  <p style="margin: 0; font-size: 11px; line-height: 1.6; color: #52525b; text-align: center;">
                    You can find detailed per-question breakdowns in your dashboard.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px; border-top: 1px solid #27272a; background-color: rgba(255,255,255,0.02);">
                  <p style="margin: 0; font-size: 10px; color: #71717a; letter-spacing: 0.1em; text-transform: uppercase;">
                    &copy; 2026 HAIYA.CLICK | SECURE POLLING SYSTEM
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendPollResultsEmail = async (email, name, pollTitle, totalVoters, dashboardUrl) => {
  const html = getPollResultsTemplate(name, pollTitle, totalVoters, dashboardUrl);
  await transporter.sendMail({
    from: `HAIYA.CLICK <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: `[ POLL CLOSED ] ${pollTitle} — Results are ready`,
    html,
  });
};

export { sendMail, sendVerificationEmail, sendPollResultsEmail };