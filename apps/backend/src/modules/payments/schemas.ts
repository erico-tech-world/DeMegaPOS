import { z } from 'zod'

export const initiatePaymentSchema = z.object({
    amount: z.number().positive(),
    currency: z.string().default('NGN'),
    provider: z.enum(['MONIEPOINT', 'MONNIFY', 'OPAY', 'PAYSTACK', 'FLUTTERWAVE', 'STRIPE', 'GTBANK']),
    orderId: z.string(),
    paymentType: z.enum(['CASH', 'CARD', 'TRANSFER', 'USSD', 'QR']).default('CARD'),
})

export const paymentResponseSchema = z.object({
    paymentId: z.string().optional(),
    status: z.string(),
    checkoutUrl: z.string().optional(),
    reference: z.string(),
    message: z.string().optional(),
})

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>
