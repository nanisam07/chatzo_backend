export const forgotPasswordTemplate = (params: {
  fullName: string;
  otp: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password – CHATZO</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 12px; }
    .text { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 28px; }
    .otp-box { background: #fff5f5; border: 2px dashed #dc2626; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px; }
    .otp-code { font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #b91c1c; font-family: 'Courier New', monospace; }
    .otp-note { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
    .footer { background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>CHATZO</h1>
      <p>Password Reset Request</p>
    </div>
    <div class="body">
      <p class="greeting">Hello, ${params.fullName}!</p>
      <p class="text">
        We received a request to reset the password for your CHATZO merchant account. Use the OTP below to proceed with your password reset.
      </p>
      <div class="otp-box">
        <div class="otp-code">${params.otp}</div>
        <p class="otp-note">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
      <div class="warning">
        ⚠️ If you did not request a password reset, please ignore this email and consider changing your password immediately if you suspect unauthorized access.
      </div>
      <p class="text">
        For security, this link can only be used once and will expire after 10 minutes.
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
