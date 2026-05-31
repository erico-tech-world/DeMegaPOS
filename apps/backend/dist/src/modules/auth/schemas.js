import { z } from 'zod';
export const loginSchema = z.object({
    identifier: z.string().min(1, 'Email or Phone is required'), // Supports Email or Phone
    password: z.string().min(6),
});
export const registerSchema = z.object({
    email: z.string().email().optional(),
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
});
export const businessRegisterSchema = z.object({
    businessName: z.string().min(3),
    name: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    password: z.string().min(6),
    confirmPassword: z.string(),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided",
    path: ["email", "phone"]
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
});
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
});
export const errorSchema = z.object({
    message: z.string(),
});
