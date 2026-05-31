import { z } from 'zod';
export const createAppSchema = z.object({
    name: z.string().min(3),
    webhookUrl: z.string().url().optional(),
    scopes: z.array(z.string()).default(['orders:read', 'inventory:read']),
});
export const appResponseSchema = z.object({
    id: z.string(),
    name: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    scopes: z.array(z.string()),
    webhookUrl: z.string().nullable(),
    createdAt: z.date(),
});
