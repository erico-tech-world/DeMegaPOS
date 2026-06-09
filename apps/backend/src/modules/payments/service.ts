import { prisma } from '../../lib/prisma.js'
import { InitiatePaymentInput } from './schemas.js'
import crypto from 'crypto'
import { initiateMonnifyTerminalPayment, processMonnifyWebhook } from './monnify.service.js'

export async function initiatePayment(data: InitiatePaymentInput) {
    if (data.provider === 'MONNIFY' || data.provider === 'MONIEPOINT') {
        return await initiateMonnifyTerminalPayment(data.orderId, data.amount)
    }

    const reference = `REF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    // Standard fallback simulation (updates order paymentStatus to SUCCESS instantly)
    await prisma.order.update({
        where: { id: data.orderId },
        data: { paymentStatus: 'SUCCESS' },
    })

    return {
        paymentId: crypto.randomBytes(16).toString('hex'),
        status: 'SUCCESS',
        reference,
        checkoutUrl: `https://checkout.demegapos.com/${reference}`,
    }
}

export async function handlePaymentWebhook(provider: string, payload: any) {
    console.log(`Received webhook from ${provider}:`, payload)
    
    if (provider === 'monnify' || provider === 'moniepoint') {
        return await processMonnifyWebhook(payload)
    }
    
    return null
}
