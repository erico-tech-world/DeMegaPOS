import { z } from 'zod'

export const loginSchema = z.object({
    identifier: z.string().min(1, 'Email, Phone or Staff ID is required'), // Supports Email, Phone, or Staff Code
    password: z.string().min(1, 'Password is required'),
})

export const staffLoginSchema = z.object({
    branchOrBusinessCode: z.string().optional(), // e.g. BR-LAG-01, DM-BIZ-9011 or business slug
    identifier: z.string().min(1, 'Staff Code or Email is required'), // e.g. EMP-2026-004, cashier@demega.com
    password: z.string().min(1, 'Staff account password is required'),
    pin: z.string().regex(/^[0-9]{4,6}$/, 'Terminal PIN must be 4–6 digits'),
})

export const registerSchema = z.object({
    email: z.email().optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(6),
    confirmPassword: z.string(),
    name: z.string().optional(),
    tenantId: z.string(),
    role: z.enum(['SUPER_ADMIN', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'CASHIER']).default('CASHIER'),
    branchId: z.string().optional(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
})

export const businessRegisterSchema = z.object({
    businessName: z.string().min(3),
    name: z.string().min(2),
    email: z.email().optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(6),
    confirmPassword: z.string(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
})

export type BusinessRegisterInput = z.infer<typeof businessRegisterSchema>

export const authResponseSchema = z.object({
    user: z.object({
        id: z.string(),
        email: z.string().nullable(),
        phone: z.string().nullable(),
        name: z.string().nullable(),
        role: z.string(),
        tenantId: z.string(),
        branchId: z.string().nullable(),
        permissions: z.any().nullable(),
    }),
    accessToken: z.string(),
})

export const errorSchema = z.object({
    message: z.string(),
    accountType: z.string().optional(),
    email: z.string().optional(),
    identifier: z.string().optional(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type StaffLoginInput = z.infer<typeof staffLoginSchema>
export type RegisterInput = z.infer<typeof registerSchema>

