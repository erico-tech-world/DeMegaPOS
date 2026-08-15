import dns from 'dns'
import nodemailer from 'nodemailer'

// Force IPv4 first globally across DNS lookups to avoid ENETUNREACH in IPv4-only cloud containers
try {
    dns.setDefaultResultOrder('ipv4first')
} catch (_) {}

// ---------------------------------------------------------------------------
// Resilient Hybrid Mail Provider & Dispatcher
//
// Provider Architecture:
// 1. Gmail SMTP (IPv4 forced on Port 465 SSL / 587 TLS)
//    - Sends to ANY recipient/domain (no free-tier single-recipient restriction)
// 2. Resend HTTPS REST API (Port 443 — fast alternative)
// ---------------------------------------------------------------------------

export interface MailOptions {
    to: string
    subject: string
    html: string
    from?: string
}

/**
 * Dispatch an email via Resend HTTPS REST API (Port 443).
 */
async function sendViaResendHttpApi(opts: MailOptions, apiKey: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const fromAddress = opts.from || process.env.SMTP_FROM || 'DeMegaPOS <onboarding@resend.dev>'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    try {
        console.log(`[MAIL:Resend-HTTP] Dispatching email to ${opts.to}...`)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey.trim()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromAddress,
                to: [opts.to],
                subject: opts.subject,
                html: opts.html,
            }),
            signal: controller.signal,
        })

        const data: any = await response.json().catch(() => ({}))

        if (response.ok && data?.id) {
            console.log(`[MAIL:Resend-HTTP] Delivered successfully to ${opts.to}. MessageID: ${data.id}`)
            return { success: true, messageId: data.id }
        } else {
            const errMsg = data?.message || `HTTP ${response.status}`
            console.warn(`[MAIL:Resend-HTTP] Resend dispatch failed for ${opts.to}: ${errMsg}`)
            return { success: false, error: errMsg }
        }
    } catch (err: any) {
        const errMsg = err.name === 'AbortError' ? 'Timeout after 7s' : (err.message || String(err))
        console.warn(`[MAIL:Resend-HTTP] Exception: ${errMsg}`)
        return { success: false, error: errMsg }
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * Dispatch an email via Gmail SMTP using Google App Password.
 * Forces IPv4 (family: 4) to prevent ENETUNREACH on cloud containers without IPv6 routes.
 * Tries Port 465 (SSL) first, and falls back to Port 587 (STARTTLS).
 */
async function sendViaGmailSmtp(opts: MailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const user = (process.env.FALLBACK_SMTP_USER || process.env.GMAIL_USER || '').trim()
    const pass = (process.env.FALLBACK_SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim()
    const fromAddress = opts.from || process.env.FALLBACK_SMTP_FROM || process.env.GMAIL_FROM || (user ? `"DeMegaPOS" <${user}>` : `"DeMegaPOS" <demegakitchen5@gmail.com>`)

    if (!user || !pass) {
        console.warn('[MAIL:Gmail-SMTP] Skipping Gmail: GMAIL_USER or App Password not configured.')
        return { success: false, error: 'Gmail credentials (GMAIL_USER & GMAIL_APP_PASSWORD) not configured.' }
    }

    // Try SSL Port 465 (IPv4 forced) first
    try {
        console.log(`[MAIL:Gmail-SMTP] Attempting dispatch to ${opts.to} via Gmail SMTP SSL (port 465, IPv4)...`)
        const transporter465 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            family: 4, // <-- Force IPv4 socket connection to prevent ENETUNREACH in Docker/Render
            connectionTimeout: 8000,
            greetingTimeout: 8000,
            socketTimeout: 8000,
        } as any)

        const info = await transporter465.sendMail({
            from: fromAddress,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
        })
        console.log(`[MAIL:Gmail-SMTP] Delivered successfully via port 465 to ${opts.to}. MessageID: ${info.messageId}`)
        return { success: true, messageId: info.messageId }
    } catch (err465: any) {
        console.warn(`[MAIL:Gmail-SMTP] Port 465 attempt failed: ${err465.message}. Attempting Port 587 STARTTLS (IPv4)...`)

        // Fallback to Port 587 TLS (IPv4 forced)
        try {
            const transporter587 = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: { user, pass },
                family: 4, // <-- Force IPv4 socket connection
                connectionTimeout: 8000,
                greetingTimeout: 8000,
                socketTimeout: 8000,
            } as any)

            const info = await transporter587.sendMail({
                from: fromAddress,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
            })
            console.log(`[MAIL:Gmail-SMTP] Delivered successfully via port 587 to ${opts.to}. MessageID: ${info.messageId}`)
            return { success: true, messageId: info.messageId }
        } catch (err587: any) {
            console.error(`[MAIL:Gmail-SMTP] Port 587 attempt also failed: ${err587.message}`)
            return { success: false, error: `Gmail SMTP failed (465: ${err465.message}, 587: ${err587.message})` }
        }
    }
}

/**
 * Unified sendMail dispatcher with automatic multi-provider fallback.
 *
 * Execution Logic:
 * - If MAIL_PROVIDER === 'GMAIL': Gmail SMTP (Primary) -> Resend HTTP (Fallback)
 * - If MAIL_PROVIDER === 'RESEND': Resend HTTP (Primary) -> Gmail SMTP (Fallback)
 */
export async function sendMail(opts: MailOptions): Promise<{ provider: string; messageId?: string }> {
    const provider = (process.env.MAIL_PROVIDER || 'GMAIL').toUpperCase()
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || '').trim()
    const hasResend = resendApiKey.startsWith('re_')
    const hasGmail = Boolean(
        (process.env.FALLBACK_SMTP_USER || process.env.GMAIL_USER) &&
        (process.env.FALLBACK_SMTP_PASS || process.env.GMAIL_APP_PASSWORD)
    )

    console.log(`[MAIL] Dispatch to ${opts.to}. Configured: Gmail=${hasGmail}, Resend=${hasResend}, Preferred=${provider}`)

    if (provider === 'GMAIL') {
        let gmailError = ''
        if (hasGmail) {
            const gmailRes = await sendViaGmailSmtp(opts)
            if (gmailRes.success) {
                return { provider: 'Gmail-SMTP', messageId: gmailRes.messageId }
            }
            gmailError = gmailRes.error || 'Gmail dispatch failed'
            console.warn(`[MAIL] Preferred provider Gmail failed: ${gmailError}. Falling back to Resend...`)
        } else {
            gmailError = 'Gmail credentials (GMAIL_USER & GMAIL_APP_PASSWORD) not configured.'
        }

        if (hasResend) {
            const resendRes = await sendViaResendHttpApi(opts, resendApiKey)
            if (resendRes.success) {
                return { provider: 'Resend-HTTP', messageId: resendRes.messageId }
            }
            console.error(`[MAIL] Fallback Resend also failed: ${resendRes.error}`)
            throw new Error(`Email dispatch failed. Gmail: ${gmailError}. Resend fallback: ${resendRes.error}`)
        } else {
            throw new Error(`Gmail failed (${gmailError}) and Resend API key is not configured as fallback.`)
        }
    } else {
        // Preferred: Resend
        let resendError = ''
        if (hasResend) {
            const resendRes = await sendViaResendHttpApi(opts, resendApiKey)
            if (resendRes.success) {
                return { provider: 'Resend-HTTP', messageId: resendRes.messageId }
            }
            resendError = resendRes.error || 'Resend rejected/restricted'
            console.warn(`[MAIL] Resend dispatch failed (${resendError}). Executing automatic fallback to Gmail SMTP...`)
        } else {
            resendError = 'Resend API key not configured.'
        }

        if (hasGmail) {
            const gmailRes = await sendViaGmailSmtp(opts)
            if (gmailRes.success) {
                return { provider: 'Gmail-SMTP', messageId: gmailRes.messageId }
            }
            console.error(`[MAIL] Gmail fallback also failed: ${gmailRes.error}`)
            throw new Error(`Email dispatch failed on both providers. Resend: ${resendError}. Gmail fallback: ${gmailRes.error}`)
        } else {
            throw new Error(`Resend failed (${resendError}) and Gmail credentials are not configured as a fallback. Please add GMAIL_USER and GMAIL_APP_PASSWORD in your hosting dashboard.`)
        }
    }
}

// ---------------------------------------------------------------------------
// Reusable HTML email templates
// ---------------------------------------------------------------------------

export function buildStaffInviteEmail(params: {
    businessName: string
    role: string
    inviteUrl: string
    expiresInDays: number
}): string {
    const { businessName, role, inviteUrl, expiresInDays } = params
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
</html>`
}
