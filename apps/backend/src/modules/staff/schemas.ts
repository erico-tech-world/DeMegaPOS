import { z } from 'zod'

export const inviteStaffSchema = z.object({
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    role: z.enum(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']),
    branchId: z.string().optional(),
    settings: z.record(z.string(), z.any()).optional(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
})

export const updatePermissionsSchema = z.object({
    userId: z.string(),
    permissions: z.record(z.string(), z.boolean())
})

export const staffResponseSchema = z.object({
    id: z.string(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    name: z.string().nullable(),
    role: z.string(),
    branchId: z.string().nullable(),
    permissions: z.any().nullable(),
})
