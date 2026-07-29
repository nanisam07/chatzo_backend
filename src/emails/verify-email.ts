export const verifyEmailTemplate = (params: {
  fullName: string;
  otp: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your Email – CHATZO</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    .text { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 28px; }
    .otp-box { background: #f0f7ff; border: 2px dashed #2563EB; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #1d4ed8; font-family: 'Courier New', monospace; }
    .otp-note { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .footer { background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>CHATZO</h1>
      <p>WhatsApp Commerce Platform</p>
    </div>
    <div class="body">
      <p class="greeting">Hello, ${params.fullName}! 👋</p>
      <p class="text">
        Welcome to CHATZO. To complete your registration and activate your merchant account, please verify your email address using the OTP below.
      </p>
      <div class="otp-box">
        <div class="otp-code">${params.otp}</div>
        <p class="otp-note">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
      <p class="text">
        If you did not create an account with CHATZO, you can safely ignore this email. Your account will not be activated without verification.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CHATZO. All rights reserved.</p>
      <p style="margin-top:6px;">This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
};
