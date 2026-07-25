import { z } from 'zod'

export const createIntegrationSchema = z.object({
    provider: z.string().default('MONNIFY'),
    label: z.string().optional(),
    apiKey: z.string(),
    secretKey: z.string(),
    contractCode: z.string(),
    baseUrl: z.string().optional(),
    isActive: z.boolean().optional(),
})

export const mapTerminalTransactionSchema = z.object({
    transactionRef: z.string(),
    paymentRef: z.string().optional(),
    amount: z.number().positive(),
    integrationId: z.string().optional(),
    settledAt: z.string().optional(),
    rawResponse: z.any().optional(),
})

export const manualPaymentSchema = z.object({
    posDeviceType: z.string(),
})

export type CreateIntegrationInput = z.infer<typeof createIntegrationSchema>
export type MapTerminalTransactionInput = z.infer<typeof mapTerminalTransactionSchema>
