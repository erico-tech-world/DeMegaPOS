import https from 'https';
/**
 * Send an SMS via the Twilio REST API.
 * Uses the Node.js built-in `https` module — no extra Twilio SDK needed.
 * Throws on failure so callers can handle errors appropriately.
 */
export async function sendSms(opts) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
        console.warn('[SMS] Twilio credentials not configured — skipping SMS dispatch.');
        return;
    }
    const body = new URLSearchParams({
        To: opts.to,
        From: fromNumber,
        Body: opts.body,
    }).toString();
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    await new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.twilio.com',
            path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(body),
            },
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                }
                else {
                    reject(new Error(`Twilio API error ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
