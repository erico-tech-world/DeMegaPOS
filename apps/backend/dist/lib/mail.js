import nodemailer from 'nodemailer';
// ---------------------------------------------------------------------------
// Nodemailer SMTP Transport
// Set these variables in your .env file:
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
// ---------------------------------------------------------------------------
// Create transporters dynamically based on configuration to allow runtime failover
function getResendTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.resend.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
function getGmailTransporter() {
    return nodemailer.createTransport({
        host: process.env.FALLBACK_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.FALLBACK_SMTP_PORT || '587', 10),
        secure: process.env.FALLBACK_SMTP_SECURE === 'true',
        auth: {
            user: process.env.FALLBACK_SMTP_USER,
            pass: process.env.FALLBACK_SMTP_PASS,
        },
    });
}
/**
 * Send an email via the configured SMTP transporter.
 * Supports primary/fallback logic between Resend and Gmail.
 */
export async function sendMail(opts) {
    const provider = (process.env.MAIL_PROVIDER || 'RESEND').toUpperCase();
    let primaryTransporter;
    let primaryFrom;
    let fallbackTransporter;
    let fallbackFrom;
    if (provider === 'GMAIL') {
        primaryTransporter = getGmailTransporter();
        primaryFrom = process.env.FALLBACK_SMTP_FROM || `"DeMegaPOS" <demegakitchen5@gmail.com>`;
        fallbackTransporter = getResendTransporter();
        fallbackFrom = process.env.SMTP_FROM || `"DeMegaPOS" <onboarding@resend.dev>`;
    }
    else {
        primaryTransporter = getResendTransporter();
        primaryFrom = process.env.SMTP_FROM || `"DeMegaPOS" <onboarding@resend.dev>`;
        fallbackTransporter = getGmailTransporter();
        fallbackFrom = process.env.FALLBACK_SMTP_FROM || `"DeMegaPOS" <demegakitchen5@gmail.com>`;
    }
    try {
        console.log(`[MAIL] Attempting email dispatch to ${opts.to} via primary provider (${provider})...`);
        await primaryTransporter.sendMail({
            from: primaryFrom,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
        });
        console.log(`[MAIL] Email successfully sent to ${opts.to} via primary provider (${provider}).`);
    }
    catch (err) {
        console.error(`[MAIL] Primary email dispatch failed via ${provider}:`, err.message || err);
        console.log(`[MAIL] Executing automatic failover to fallback provider...`);
        try {
            await fallbackTransporter.sendMail({
                from: fallbackFrom,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
            });
            console.log(`[MAIL] Fallback email dispatch successful to ${opts.to}.`);
        }
        catch (fallbackErr) {
            console.error(`[MAIL] Fallback email dispatch also failed:`, fallbackErr.message || fallbackErr);
            throw new Error(`Email dispatch failed on both primary and fallback providers. Primary error: ${err.message}. Fallback error: ${fallbackErr.message}`);
        }
    }
}
// ---------------------------------------------------------------------------
// Reusable HTML email templates
// ---------------------------------------------------------------------------
export function buildStaffInviteEmail(params) {
    const { businessName, role, inviteUrl, expiresInDays } = params;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited to DeMegaPOS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 40px 20px; }
    .card { background: #ffffff; max-width: 560px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1A1A1A 0%, #2D7A3E 100%); padding: 40px 40px 32px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin: 8px 0 0; }
    .body { padding: 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .role-badge { display: inline-block; background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; border-radius: 999px; padding: 4px 14px; font-size: 13px; font-weight: 700; margin-bottom: 24px; }
    .cta-btn { display: block; background: linear-gradient(135deg, #1A1A1A 0%, #2D7A3E 100%); color: #ffffff !important; text-decoration: none; text-align: center; padding: 16px 32px; border-radius: 12px; font-size: 15px; font-weight: 800; letter-spacing: 0.3px; margin: 24px 0; }
    .note { font-size: 13px; color: #9CA3AF; text-align: center; margin-top: 24px; }
    .footer { background: #F9FAFB; padding: 24px 40px; text-align: center; border-top: 1px solid #F3F4F6; }
    .footer p { color: #9CA3AF; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🛒 DeMegaPOS</h1>
      <p>Business Intelligence Platform</p>
    </div>
    <div class="body">
      <p>You've been invited to join <strong>${businessName}</strong> on DeMegaPOS as a staff member.</p>
      <span class="role-badge">Role: ${role.replace('_', ' ')}</span>
      <p>Click the button below to accept your invitation and set up your account. This link is valid for <strong>${expiresInDays} days</strong>.</p>
      <a href="${inviteUrl}" class="cta-btn">Accept Invitation &amp; Set Password →</a>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p style="word-break:break-all; font-size:13px; color:#6B7280;">${inviteUrl}</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} DeMegaPOS · If you weren't expecting this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;
}
