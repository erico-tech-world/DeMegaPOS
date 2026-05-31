import { z } from 'zod'

export const createCategorySchema = z.object({
    name: z.string().min(2),
})

export const categoryResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
})

export const variantSchema = z.object({
    name: z.string(),
    sku: z.string().optional(),
    price: z.number().positive(),
    costPrice: z.number().nonnegative().optional().nullable(),
    vipPrice: z.number().nonnegative().optional().nullable(),
    unit: z.string().optional(),
    stock: z.number().int().min(0).default(0),
})

export const bundleItemSchema = z.object({
    componentProductId: z.string(),
    quantity: z.number().int().positive().default(1),
})

export const createProductSchema = z.object({
    name: z.string().min(2),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    price: z.number().nonnegative(),
    costPrice: z.number().nonnegative().optional().nullable(),
    vipPrice: z.number().nonnegative().optional().nullable(),
    unit: z.string().optional(),
    stock: z.number().int().min(0).default(0),
    minStock: z.number().int().min(0).default(5),
    type: z.enum(['STANDARD', 'VARIANT', 'BUNDLED']).default('STANDARD'),
    expiryDate: z.string().datetime().optional().nullable(),
    batchNumber: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    variants: z.array(variantSchema).optional(),
    bundleItems: z.array(bundleItemSchema).optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const productResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string().nullable(),
    barcode: z.string().nullable(),
    price: z.any(),
    costPrice: z.any().nullable(),
    vipPrice: z.any().nullable(),
    unit: z.string().nullable(),
    stock: z.number(),
    minStock: z.number(),
    type: z.string(),
    expiryDate: z.date().nullable(),
    batchNumber: z.string().nullable(),
    imageUrl: z.string().nullable().optional(),
    categoryId: z.string().nullable(),
    category: categoryResponseSchema.nullable().optional(),
    variants: z.array(z.any()).optional(),
    bundleItems: z.array(z.any()).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const stockAdjustmentSchema = z.object({
    productId: z.string(),
    variantId: z.string().optional(),
    type: z.enum(['IN', 'OUT', 'ADJUST', 'RETURN']),
    quantity: z.number().int().positive(),
    reason: z.string().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
