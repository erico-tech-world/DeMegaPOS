import { z } from 'zod'

export const createIntegrationSchema = z.object({
    provider: z.string().min(1).default('MONNIFY'),
    label: z.string().optional(),
    apiKey: z.string().optional(),
    secretKey: z.string().optional(),
    contractCode: z.string().optional(),
    baseUrl: z.string().optional(),
    isActive: z.boolean().default(true),
})

export const integrationResponseSchema = z.object({
    id: z.string(),
    tenantId: z.string(),
    provider: z.string(),
    label: z.string().nullable().optional(),
    isActive: z.boolean(),
    contractCode: z.string().nullable().optional(),
    baseUrl: z.string().nullable().optional(),
    createdAt: z.date(),
})

export const mapTerminalTransactionSchema = z.object({
    transactionRef: z.string().min(1),
    paymentRef: z.string().optional(),
    amount: z.number().positive(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    settledAt: z.string().optional(),
    rawResponse: z.any().optional(),
})

export const manualPaymentSchema = z.object({
    posDeviceType: z.string().min(1, 'POS Terminal device type is required'),
})

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>
export type MapTerminalTransactionInput = z.infer<typeof mapTerminalTransactionSchema>
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>
