import { z } from 'zod';
import { createTenantSchema, tenantResponseSchema } from './schemas.js';
import { createTenant, getTenants, getTenantById } from './service.js';
import { prisma } from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
export default async function tenantRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/', {
        schema: {
            body: createTenantSchema,
            response: { 201: tenantResponseSchema },
        },
    }, async (request, reply) => {
        const tenant = await createTenant(request.body);
        return reply.code(201).send(tenant);
    });
    server.get('/', {
        schema: {
            response: { 200: z.array(tenantResponseSchema) },
        },
    }, async () => {
        return getTenants();
    });
    server.get('/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            response: {
                200: tenantResponseSchema.nullable(),
                404: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const tenant = await getTenantById(id);
        if (!tenant) {
            return reply.code(404).send({ message: 'Tenant not found' });
        }
        return tenant;
    });
    // -------------------------------------------------------------------------
    // Universal Access Engine — PATCH /tenants/settings/universal-password
    // Only SUPER_ADMIN of the tenant can set/update this password.
    // -------------------------------------------------------------------------
    server.patch('/settings/universal-password', {
        schema: {
            body: z.object({
                currentUniversalPassword: z.string().optional(), // required when one is already set
                newPassword: z.string().min(12, 'Universal password must be at least 12 characters'),
            }),
            response: {
                200: z.object({ message: z.string() }),
                400: z.object({ message: z.string() }),
                403: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { tenantId, role } = request.user;
        // Only SUPER_ADMIN may manage this
        if (role !== 'SUPER_ADMIN') {
            return reply.code(403).send({ message: 'Only Super Admins can manage the Universal Access Engine.' });
        }
        const { currentUniversalPassword, newPassword } = request.body;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { universalPasswordHash: true },
        });
        if (!tenant) {
            return reply.code(400).send({ message: 'Tenant not found.' });
        }
        // If a universal password already exists, require the current one to change it
        if (tenant.universalPasswordHash) {
            if (!currentUniversalPassword) {
                return reply.code(400).send({ message: 'Current universal password is required to set a new one.' });
            }
            const isValid = await bcrypt.compare(currentUniversalPassword, tenant.universalPasswordHash);
            if (!isValid) {
                return reply.code(400).send({ message: 'Current universal password is incorrect.' });
            }
        }
        const newHash = await bcrypt.hash(newPassword, 12);
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { universalPasswordHash: newHash },
        });
        console.log(`[SECURITY] Universal Access Engine password updated for tenant ${tenantId}`);
        return reply.send({ message: 'Universal Access Engine password updated successfully.' });
    });
    // -------------------------------------------------------------------------
    // Check whether a universal password is already configured
    // -------------------------------------------------------------------------
    server.get('/settings/universal-password/status', {
        schema: {
            response: {
                200: z.object({ isConfigured: z.boolean() }),
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { universalPasswordHash: true },
        });
        return reply.send({ isConfigured: !!tenant?.universalPasswordHash });
    });
    // -------------------------------------------------------------------------
    // Branches Management — GET /tenants/branches
    // -------------------------------------------------------------------------
    server.get('/branches', {
        schema: {
            response: {
                200: z.array(z.object({
                    id: z.string(),
                    name: z.string(),
                    location: z.string().nullable().optional(),
                    isActive: z.boolean(),
                    createdAt: z.string().or(z.date()),
                })),
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const branches = await prisma.store.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true, location: true, isActive: true, createdAt: true }
        });
        return reply.send(branches);
    });
    // -------------------------------------------------------------------------
    // Branches Management — POST /tenants/branches
    // -------------------------------------------------------------------------
    server.post('/branches', {
        schema: {
            body: z.object({
                name: z.string().min(1, 'Branch name is required'),
                location: z.string().optional(),
            }),
            response: {
                201: z.object({
                    id: z.string(),
                    name: z.string(),
                    location: z.string().nullable().optional(),
                    isActive: z.boolean(),
                    createdAt: z.string().or(z.date()),
                }),
                403: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { tenantId, role } = request.user;
        if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ message: 'Insufficient permissions to create a branch.' });
        }
        const { name, location } = request.body;
        const branch = await prisma.store.create({
            data: { name, location: location || null, tenantId, isActive: true },
            select: { id: true, name: true, location: true, isActive: true, createdAt: true }
        });
        return reply.code(201).send(branch);
    });
    // -------------------------------------------------------------------------
    // Branches Management — PUT /tenants/branches/:id
    // -------------------------------------------------------------------------
    server.put('/branches/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: z.object({
                name: z.string().optional(),
                location: z.string().nullable().optional(),
                isActive: z.boolean().optional(),
            }),
        },
    }, async (request, reply) => {
        const { tenantId, role } = request.user;
        const { id } = request.params;
        if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
            return reply.code(403).send({ message: 'Insufficient permissions.' });
        }
        const branch = await prisma.store.findFirst({ where: { id, tenantId } });
        if (!branch)
            return reply.code(404).send({ message: 'Branch not found.' });
        const updated = await prisma.store.update({
            where: { id },
            data: request.body,
            select: { id: true, name: true, location: true, isActive: true, createdAt: true }
        });
        return reply.send(updated);
    });
    // -------------------------------------------------------------------------
    // Staff Permissions — PATCH /tenants/staff/:id/permissions
    // -------------------------------------------------------------------------
    server.patch('/staff/:id/permissions', {
        schema: {
            params: z.object({ id: z.string() }),
            body: z.object({
                canVoidOrders: z.boolean().optional(),
                canApplyDiscounts: z.boolean().optional(),
                canRefund: z.boolean().optional(),
                canEditPrices: z.boolean().optional(),
                canAccessReports: z.boolean().optional(),
            }),
        },
    }, async (request, reply) => {
        const { tenantId, role } = request.user;
        const { id } = request.params;
        if (!['SUPER_ADMIN', 'OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(role)) {
            return reply.code(403).send({ message: 'Insufficient permissions.' });
        }
        const staffMember = await prisma.user.findFirst({ where: { id, tenantId }, select: { id: true, permissions: true } });
        if (!staffMember)
            return reply.code(404).send({ message: 'Staff member not found.' });
        // Merge incoming toggles into existing JSON permissions blob
        const existing = staffMember.permissions || {};
        const merged = { ...existing, ...request.body };
        const updated = await prisma.user.update({
            where: { id },
            data: { permissions: merged },
            select: { id: true, name: true, role: true, permissions: true }
        });
        return reply.send(updated);
    });
}
