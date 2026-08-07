import { z } from 'zod'

export const inviteStaffSchema = z.object({
    email: z.email().optional().nullable(),
    phone: z.string().min(10).optional().nullable(),
    role: z.enum(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']),
    branchId: z.string().optional().nullable(),
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
    staffCode: z.string().nullable().optional(),
    branchId: z.string().nullable(),
    status: z.string().optional(),
    isActive: z.boolean().optional(),
    onboardedAt: z.date().nullable().optional(),
    terminatedAt: z.date().nullable().optional(),
    terminationReason: z.string().nullable().optional(),
    permissions: z.any().nullable(),
})

export const updateStaffSchema = z.object({
    name: z.string().optional(),
    email: z.email().optional().nullable(),
    phone: z.string().min(10).optional().nullable(),
    role: z.enum(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']).optional(),
    branchId: z.string().optional().nullable()
})
