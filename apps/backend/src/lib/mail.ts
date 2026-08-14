import nodemailer from 'nodemailer'

// ---------------------------------------------------------------------------
// Mail Provider & Dispatcher
//
// Supports:
// 1. Resend HTTPS REST API (Primary / Fastest — immune to cloud SMTP port blocking)
// 2. Resend SMTP (Port 465 / 587 with strict 5s connection timeouts)
// 3. Gmail SMTP (via App Password with strict 5s connection timeouts)
// ---------------------------------------------------------------------------

export interface MailOptions {
    to: string
    subject: string
    html: string
    from?: string
}

/**
 * Dispatch an email via the Resend HTTPS REST API (port 443).
 * This is the most reliable method on cloud platforms (Render, Railway, Fly.io)
 * where outbound SMTP ports (587, 465, 25) are frequently filtered or blocked.
 */
async function sendViaResendHttpApi(opts: MailOptions, apiKey: string): Promise<boolean> {
    const fromAddress = opts.from || process.env.SMTP_FROM || 'DeMegaPOS <onboarding@resend.dev>'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
        console.log(`[MAIL:Resend-HTTP] Dispatching email to ${opts.to} via Resend REST API...`)
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
            console.log(`[MAIL:Resend-HTTP] Email successfully delivered to ${opts.to}. MessageID: ${data.id}`)
            return true
        } else {
            console.warn(`[MAIL:Resend-HTTP] Resend API returned status ${response.status}:`, data?.message || data)
            return false
        }
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.warn(`[MAIL:Resend-HTTP] Request timed out after 8s.`)
        } else {
            console.warn(`[MAIL:Resend-HTTP] Request failed:`, err.message || err)
        }
        return false
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * Gmail transporter using SSL port 465 with strict timeouts.
 */
function getGmailTransporter() {
    const user = process.env.FALLBACK_SMTP_USER || ''
    const pass = (process.env.FALLBACK_SMTP_PASS || '').replace(/\s+/g, '')
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    })
}

/**
 * Resend SMTP transporter with strict timeouts.
 */
function getResendTransporter() {
    const pass = process.env.RESEND_API_KEY || process.env.SMTP_PASS || ''
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.resend.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER || 'resend',
            pass: pass ? pass.trim() : undefined,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
    })
}

/**
 * Send an email via the best available provider.
 * Priority:
 * 1. Resend HTTPS REST API (if apiKey present starting with 're_')
 * 2. Primary SMTP transporter (with 5s timeout)
 * 3. Fallback SMTP transporter (with 5s timeout)
 */
export async function sendMail(opts: MailOptions): Promise<void> {
    const resendApiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || '').trim()

    // 1. Fast Path: Resend HTTPS API (never blocked by host firewalls)
    if (resendApiKey && resendApiKey.startsWith('re_')) {
        const httpSuccess = await sendViaResendHttpApi(opts, resendApiKey)
        if (httpSuccess) {
            return
        }
        console.log('[MAIL] Resend HTTPS API was unsuccessful, falling back to SMTP transports...')
    }

    // 2. SMTP Transporters with strict 5-second connection timeouts
    const provider = (process.env.MAIL_PROVIDER || 'RESEND').toUpperCase()
    let primaryTransporter: nodemailer.Transporter
    let primaryFrom: string
    let fallbackTransporter: nodemailer.Transporter
    let fallbackFrom: string

    if (provider === 'GMAIL') {
        primaryTransporter = getGmailTransporter()
        primaryFrom = process.env.FALLBACK_SMTP_FROM || `"DeMegaPOS" <demegakitchen5@gmail.com>`
        fallbackTransporter = getResendTransporter()
        fallbackFrom = process.env.SMTP_FROM || `"DeMegaPOS" <onboarding@resend.dev>`
    } else {
        primaryTransporter = getResendTransporter()
        primaryFrom = process.env.SMTP_FROM || `"DeMegaPOS" <onboarding@resend.dev>`
        fallbackTransporter = getGmailTransporter()
        fallbackFrom = process.env.FALLBACK_SMTP_FROM || `"DeMegaPOS" <demegakitchen5@gmail.com>`
    }

    try {
        console.log(`[MAIL:SMTP] Attempting email dispatch to ${opts.to} via ${provider}...`)
        await primaryTransporter.sendMail({
            from: primaryFrom,
            to: opts.to,
            subject: opts.subject,
            html: opts.html,
        })
        console.log(`[MAIL:SMTP] Email successfully sent to ${opts.to} via ${provider}.`)
    } catch (err: any) {
        console.warn(`[MAIL:SMTP] Primary provider (${provider}) failed:`, err.message || err)
        console.log(`[MAIL:SMTP] Trying fallback provider...`)

        try {
            await fallbackTransporter.sendMail({
                from: fallbackFrom,
                to: opts.to,
                subject: opts.subject,
                html: opts.html,
            })
            console.log(`[MAIL:SMTP] Fallback provider successfully sent email to ${opts.to}.`)
        } catch (fallbackErr: any) {
            console.error(`[MAIL:SMTP] Fallback also failed:`, fallbackErr.message || fallbackErr)
            throw new Error(`Email dispatch failed. Primary error: ${err.message}. Fallback error: ${fallbackErr.message}`)
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
