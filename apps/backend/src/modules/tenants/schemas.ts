import { z } from 'zod'

export const createTenantSchema = z.object({
    name: z.string().min(3),
    domain: z.string().optional(),
    settings: z.record(z.string(), z.any()).optional(),
})

export const tenantResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    domain: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export type CreateTenantInput = z.infer<typeof createTenantSchema>
