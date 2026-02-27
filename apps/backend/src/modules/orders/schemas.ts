import { z } from 'zod'

export const splitPaymentSchema = z.object({
    method: z.enum(['CASH', 'CARD', 'TRANSFER', 'WALLET']),
    amount: z.number().positive(),
    reference: z.string().optional(),
})

export const createOrderItemSchema = z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive(),
    price: z.number().positive(),
})

export const createOrderSchema = z.object({
    storeId: z.string(),
    customerId: z.string().optional(),
    items: z.array(createOrderItemSchema),
    totalAmount: z.number().positive(),
    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'WALLET', 'SPLIT', 'CREDIT']),
    splitPayments: z.array(splitPaymentSchema).optional(),
    dueDate: z.string().datetime().optional(), // For credit sales
})

export const orderResponseSchema = z.object({
    id: z.string(),
    storeId: z.string(),
    customerId: z.string().nullable(),
    totalAmount: z.any(),
    status: z.string(),
    paymentStatus: z.string(),
    items: z.array(z.any()),
    splitPayments: z.array(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export type CreateOrderInput = z.infer<typeof createOrderSchema>
