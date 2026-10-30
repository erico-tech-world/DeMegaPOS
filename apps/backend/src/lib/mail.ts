import dns from 'dns'
import nodemailer from 'nodemailer'

// Force IPv4 first globally across DNS lookups to avoid ENETUNREACH in IPv4-only cloud containers
try {
    dns.setDefaultResultOrder('ipv4first')
} catch (_) {}

/**
 * Custom DNS lookup function that strictly forces IPv4 resolution.
 */
const ipv4Lookup = (hostname: string, options: any, callback: any) => {
    if (typeof options === 'function') {
        callback = options
        options = {}
    }
    return dns.lookup(hostname, { family: 4 }, callback)
}

/**
 * Helper to sanitize and fix malformed 'from' email headers.
 */
function sanitizeFrom(raw: string | undefined, defaultEmail: string): string {
    if (!raw) return `DeMegaPOS <${defaultEmail}>`
    let s = raw.trim().replace(/^["']+|["']+$/g, '')
    if (s.includes('<') && !s.includes('>')) {
        s += '>'
    }
    if (!s.includes('<') && s.includes('@')) {
        s = `DeMegaPOS <${s}>`
    }
    return s
}

export interface MailOptions {
    to: string
    subject: string
    html: string
    from?: string
}

// ---------------------------------------------------------------------------
// HTTPS REST Dispatchers (Port 443 — NEVER blocked by Render or Cloud hosts)
// ---------------------------------------------------------------------------

/**
 * 1. Resend HTTPS REST API (Port 443)
 */
async function sendViaResendHttpApi(opts: MailOptions, apiKey: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanKey = apiKey.trim().replace(/^["']+|["']+$/g, '')
    const resendFrom = (process.env.RESEND_FROM || '').trim().replace(/^["']+|["']+$/g, '') || 'DeMegaPOS <onboarding@resend.dev>'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    try {
        console.log(`[MAIL:Resend-HTTP] Dispatching email to ${opts.to} from ${resendFrom}...`)
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${cleanKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: resendFrom,
                to: [opts.to.trim()],
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
 * 2. Brevo (Sendinblue) HTTPS REST API (Port 443 — free 300 emails/day to ANY domain with zero restrictions)
 */
async function sendViaBrevoHttpApi(opts: MailOptions, apiKey: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const cleanKey = apiKey.trim().replace(/^["']+|["']+$/g, '')
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_USER || process.env.FALLBACK_SMTP_USER || 'demegakitchen5@gmail.com').trim().replace(/^["']+|["']+$/g, '')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 7000)

    try {
        console.log(`[MAIL:Brevo-HTTP] Dispatching email to ${opts.to} via Brevo HTTPS REST API (sender: ${senderEmail})...`)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': cleanKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'DeMegaPOS', email: senderEmail },
                to: [{ email: opts.to.trim() }],
                subject: opts.subject,
                htmlContent: opts.html,
            }),
            signal: controller.signal,
        })

        const data: any = await response.json().catch(() => ({}))

        if (response.ok && data?.messageId) {
            console.log(`[MAIL:Brevo-HTTP] Delivered successfully to ${opts.to}. MessageID: ${data.messageId}`)
            return { success: true, messageId: data.messageId }
        } else {
            const errMsg = data?.message || data?.error || `HTTP ${response.status}`
            console.warn(`[MAIL:Brevo-HTTP] Brevo dispatch failed for ${opts.to}: ${errMsg}`)
            return { success: false, error: `Brevo API: ${errMsg}` }
        }
    } catch (err: any) {
        const errMsg = err.name === 'AbortError' ? 'Timeout after 7s' : (err.message || String(err))
        console.warn(`[MAIL:Brevo-HTTP] Exception: ${errMsg}`)
        return { success: false, error: errMsg }
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * 3. Gmail SMTP with IPv4 forced (Port 465 SSL / 587 TLS)
 * Note: Render free tier blocks outbound SMTP ports (465, 587). This works on Railway, VPS, Docker, or local.
 */
async function sendViaGmailSmtp(opts: MailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const user = (process.env.FALLBACK_SMTP_USER || process.env.GMAIL_USER || '').trim()
    const pass = (process.env.FALLBACK_SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim()
    const gmailFrom = sanitizeFrom(opts.from || process.env.SMTP_FROM || process.env.FALLBACK_SMTP_FROM || process.env.GMAIL_FROM, user || 'demegakitchen5@gmail.com')

    if (!user || !pass) {
        return { success: false, error: 'Gmail credentials (GMAIL_USER & GMAIL_APP_PASSWORD) not configured.' }
    }

    // Try Port 465 (SSL)
    try {
        console.log(`[MAIL:Gmail-SMTP] Attempting dispatch to ${opts.to} via Gmail SMTP SSL (port 465)...`)
        const transporter465 = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user, pass },
            lookup: ipv4Lookup,
            family: 4,
            connectionTimeout: 4000,
            greetingTimeout: 4000,
            socketTimeout: 4000,
        } as any)

        const info = await transporter465.sendMail({
            from: gmailFrom,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
        })
        console.log(`[MAIL:Gmail-SMTP] Delivered successfully via port 465 to ${opts.to}. MessageID: ${info.messageId}`)
        return { success: true, messageId: info.messageId }
    } catch (err465: any) {
        console.warn(`[MAIL:Gmail-SMTP] Port 465 failed: ${err465.message}. Attempting Port 587...`)

        // Fallback to Port 587 (TLS)
        try {
            const transporter587 = nodemailer.createTransport({
                host: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: { user, pass },
                lookup: ipv4Lookup,
                family: 4,
                connectionTimeout: 4000,
                greetingTimeout: 4000,
                socketTimeout: 4000,
            } as any)

            const info = await transporter587.sendMail({
                from: gmailFrom,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
            })
            console.log(`[MAIL:Gmail-SMTP] Delivered successfully via port 587 to ${opts.to}. MessageID: ${info.messageId}`)
            return { success: true, messageId: info.messageId }
        } catch (err587: any) {
            return { success: false, error: `Gmail SMTP blocked/unreachable (465: ${err465.message}, 587: ${err587.message})` }
        }
    }
}

// ---------------------------------------------------------------------------
// Unified Multi-Provider Mail Dispatcher
// ---------------------------------------------------------------------------

export async function sendMail(opts: MailOptions): Promise<{ provider: string; messageId?: string }> {
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || '').trim()
    const brevoApiKey = (process.env.BREVO_API_KEY || process.env.BREVO_KEY || process.env.SENDINBLUE_API_KEY || '').trim()
    const hasResend = resendApiKey.startsWith('re_')
    const hasBrevo = Boolean(brevoApiKey)
    const hasGmail = Boolean(
        (process.env.FALLBACK_SMTP_USER || process.env.GMAIL_USER) &&
        (process.env.FALLBACK_SMTP_PASS || process.env.GMAIL_APP_PASSWORD)
    )

    console.log(`[MAIL] Dispatch to ${opts.to}. Available providers: Resend=${hasResend}, Brevo=${hasBrevo}, Gmail=${hasGmail}`)

    const errors: string[] = []

    // ── Tier 1: Resend HTTPS REST API (Port 443 — fast, reliable for verified accounts/domains) ──
    if (hasResend) {
        const resendRes = await sendViaResendHttpApi(opts, resendApiKey)
        if (resendRes.success) {
            return { provider: 'Resend-HTTP', messageId: resendRes.messageId }
        }
        errors.push(`Resend: ${resendRes.error}`)
        console.warn(`[MAIL] Resend failed for ${opts.to}: ${resendRes.error}. Attempting next provider...`)
    }

    // ── Tier 2: Brevo HTTPS REST API (Port 443 — free 300 emails/day to ANY domain, no SMTP blocks) ──
    if (hasBrevo) {
        const brevoRes = await sendViaBrevoHttpApi(opts, brevoApiKey)
        if (brevoRes.success) {
            return { provider: 'Brevo-HTTP', messageId: brevoRes.messageId }
        }
        errors.push(`Brevo: ${brevoRes.error}`)
        console.warn(`[MAIL] Brevo failed for ${opts.to}: ${brevoRes.error}. Attempting next provider...`)
    }

    // ── Tier 3: Gmail SMTP (Port 465 / 587 — works on Railway, VPS, Local, Docker) ──
    if (hasGmail) {
        const gmailRes = await sendViaGmailSmtp(opts)
        if (gmailRes.success) {
            return { provider: 'Gmail-SMTP', messageId: gmailRes.messageId }
        }
        errors.push(`Gmail-SMTP: ${gmailRes.error}`)
        console.warn(`[MAIL] Gmail SMTP failed for ${opts.to}: ${gmailRes.error}`)
    }

    // If all configured providers failed:
    const errorSummary = errors.join(' | ')
    throw new Error(`Email dispatch failed. ${errorSummary}`)
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
