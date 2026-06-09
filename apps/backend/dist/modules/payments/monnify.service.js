import { prisma } from '../../lib/prisma.js';
import { updateOrderPaymentStatus } from '../orders/service.js';
import crypto from 'crypto';
export async function initiateMonnifyTerminalPayment(orderId, amount) {
    const reference = `MONNIFY-REF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    // Create a SplitPayment tracking record associated with this terminal session
    await prisma.order.update({
        where: { id: orderId },
        data: {
            splitPayments: {
                create: {
                    method: 'CARD',
                    amount: amount.toString(),
                    reference: reference
                }
            }
        }
    });
    console.log(`[MONNIFY SIMULATOR] Initiated push-to-card payment request for Order: ${orderId}, Amount: ${amount}, Reference: ${reference}`);
    // If in development mode, output the exact webhook curl command to help validation
    if (process.env.NODE_ENV === 'development' || !process.env.MONNIFY_API_KEY) {
        console.log(`[MONNIFY SIMULATOR] Webhook simulation curl command:`);
        console.log(`curl -X POST http://localhost:3000/payments/webhook/monnify \\
  -H "Content-Type: application/json" \\
  -d "{\\"event\\": \\"PAYMENT_SUCCESSFUL\\", \\"reference\\": \\"${reference}\\", \\"orderId\\": \\"${orderId}\\", \\"amount\\": ${amount}, \\"status\\": \\"PAID\\"}"`);
    }
    return {
        status: 'PENDING',
        reference,
        message: 'Push payment request sent to card terminal. Awaiting customer swipe.'
    };
}
export async function processMonnifyWebhook(payload) {
    console.log(`[MONNIFY WEBHOOK] Received payload:`, payload);
    // Robust parsing of webhook status
    const status = payload.status || (payload.event === 'PAYMENT_SUCCESSFUL' ? 'PAID' : 'FAILED');
    const reference = payload.reference;
    let orderId = payload.orderId;
    // If orderId is not sent directly but we have a reference, we resolve the order from SplitPayment
    if (!orderId && reference) {
        const splitPayment = await prisma.splitPayment.findFirst({
            where: { reference }
        });
        if (splitPayment) {
            orderId = splitPayment.orderId;
        }
    }
    if (status === 'PAID' && orderId) {
        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });
        if (order && order.paymentStatus !== 'SUCCESS') {
            console.log(`[MONNIFY WEBHOOK] Updating order ${orderId} paymentStatus to SUCCESS`);
            return await updateOrderPaymentStatus(orderId, 'SUCCESS');
        }
        return order;
    }
    return null;
}
