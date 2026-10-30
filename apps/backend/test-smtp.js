import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/backend/.env' });
import { sendMail } from './src/lib/mail.ts';

async function runDiagnostic() {
    console.log('=== DeMegaPOS Mail Diagnostic ===');
    console.log('MAIL_PROVIDER:', process.env.MAIL_PROVIDER);
    console.log('RESEND_API_KEY present:', Boolean(process.env.RESEND_API_KEY || process.env.SMTP_PASS));
    console.log('Dispatching test email...');

    try {
        await sendMail({
            to: 'delivered@resend.dev',
            subject: 'DeMegaPOS System Diagnostic Test',
            html: '<p>All systems operational. Mail dispatcher working as expected.</p>',
        });
        console.log('✅ Diagnostic test passed: Mail delivered successfully.');
    } catch (err) {
        console.error('❌ Diagnostic test failed:', err);
    }
}

runDiagnostic();
