import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

async function testSmtp() {
    console.log("MAIL_PROVIDER:", process.env.MAIL_PROVIDER);
    console.log("Testing Gmail SMTP...");
    const gmailTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.FALLBACK_SMTP_USER || 'demegakitchen5@gmail.com',
            pass: process.env.FALLBACK_SMTP_PASS ? process.env.FALLBACK_SMTP_PASS.replace(/\s+/g, '') : 'oktzxxichuwuugyf',
        },
    });

    try {
        console.log("Verifying Gmail transport connection...");
        await gmailTransporter.verify();
        console.log("Gmail SMTP Verified Successfully!");

        const info = await gmailTransporter.sendMail({
            from: `"DeMegaPOS" <${process.env.FALLBACK_SMTP_USER || 'demegakitchen5@gmail.com'}>`,
            to: 'demegakitchen5@gmail.com',
            subject: 'DeMegaPOS Test Email',
            text: 'This is a test email from DeMegaPOS SMTP diagnostic.'
        });
        console.log("Sent successfully! MessageID:", info.messageId);
    } catch (err) {
        console.error("Gmail SMTP Failed:", err);
    }
}

testSmtp();
