export const welcomeTemplate = (params: {
  fullName: string;
  businessName: string;
}): string => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to CHATZO!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px; }
    .text { font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 20px; }
    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0; }
    .feature { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
    .feature-icon { font-size: 22px; margin-bottom: 8px; }
    .feature-title { font-size: 13px; font-weight: 700; color: #111827; }
    .feature-desc { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .cta { background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%); border-radius: 12px; padding: 16px 32px; display: inline-block; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; margin: 8px 0 24px; }
    .footer { background: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎉 Welcome to CHATZO!</h1>
      <p>Your WhatsApp Commerce journey starts now</p>
    </div>
    <div class="body">
      <p class="greeting">Hi ${params.fullName}!</p>
      <p class="text">
        Congratulations! Your merchant account for <strong>${params.businessName}</strong> is now active on CHATZO. You're ready to start selling on WhatsApp.
      </p>

      <div class="feature-grid">
        <div class="feature">
          <div class="feature-icon">🛍️</div>
          <div class="feature-title">Digital Storefront</div>
          <div class="feature-desc">Share your product catalog via WhatsApp links</div>
        </div>
        <div class="feature">
          <div class="feature-icon">📦</div>
          <div class="feature-title">Order Management</div>
          <div class="feature-desc">Track and manage orders in real time</div>
        </div>
        <div class="feature">
          <div class="feature-icon">💬</div>
          <div class="feature-title">WhatsApp Inbox</div>
          <div class="feature-desc">Chat with customers directly from the dashboard</div>
        </div>
        <div class="feature">
          <div class="feature-icon">📊</div>
          <div class="feature-title">Analytics</div>
          <div class="feature-desc">Revenue insights and business performance</div>
        </div>
      </div>

      <p class="text">
        Log in to your dashboard to complete your shop setup, add products, and start receiving orders.
      </p>
      <p class="text">
        If you have any questions, our support team is here to help you every step of the way.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CHATZO. All rights reserved.</p>
      <p style="margin-top:6px;">You're receiving this email because you signed up for CHATZO.</p>
    </div>
  </div>
</body>
</html>`;
};
