import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createTenantSchema, tenantResponseSchema } from './schemas.js'
import { createTenant, getTenants, getTenantById } from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '../../lib/prisma.js'
import bcrypt from 'bcrypt'

export default async function tenantRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    server.post(
        '/',
        {
            schema: {
                body: createTenantSchema,
                response: { 201: tenantResponseSchema },
            },
        },
        async (request, reply) => {
            const tenant = await createTenant(request.body)
            return reply.code(201).send(tenant)
        }
    )

    server.get(
        '/',
        {
            schema: {
                response: { 200: z.array(tenantResponseSchema) },
            },
        },
        async () => {
            return getTenants()
        }
    )

    server.get(
        '/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                response: {
                    200: tenantResponseSchema.nullable(),
                    404: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string }
            const tenant = await getTenantById(id)
            if (!tenant) {
                return reply.code(404).send({ message: 'Tenant not found' })
            }
            return tenant
        }
    )

    // -------------------------------------------------------------------------
    // General Tenant Settings — GET /tenants/settings
    // -------------------------------------------------------------------------
    server.get(
        '/settings',
        async (request, reply) => {
            const { tenantId } = request.user as any
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true, businessCode: true, settings: true },
            })
            if (!tenant) return reply.code(404).send({ message: 'Tenant not found.' } as any)

            const stored = (tenant.settings as Record<string, any>) || {}
            return reply.send({
                businessName: stored.businessName || tenant.name || 'DeMegaPOS',
                businessEmail: stored.businessEmail || 'contact@demegapos.com',
                businessPhone: stored.businessPhone || '+234 800 000 0000',
                businessAddress: stored.businessAddress || '123 Enterprise Way, Victoria Island, Lagos',
                taxId: stored.taxId || 'TIN-987654321',
                logoUrl: stored.logoUrl || null,
                refundPolicy: stored.refundPolicy || 'PIN_REQUIRED',
                promptEmailReceipt: stored.promptEmailReceipt !== undefined ? stored.promptEmailReceipt : true,
                receiptHeader: stored.receiptHeader || 'Enterprise Retail & POS Solutions',
                receiptFooter: stored.receiptFooter || 'Thank you for shopping with us! Please come again.',
                businessCode: tenant.businessCode || null,
            })
        }
    )

    // -------------------------------------------------------------------------
    // General Tenant Settings — PATCH /tenants/settings
    // -------------------------------------------------------------------------
    server.patch(
        '/settings',
        async (request, reply) => {
            const { tenantId, role } = request.user as any
            if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
                return reply.code(403).send({ message: 'Insufficient permissions to update tenant settings.' } as any)
            }
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { name: true, settings: true },
            })
            if (!tenant) return reply.code(404).send({ message: 'Tenant not found.' } as any)

            const existingSettings = (tenant.settings as Record<string, any>) || {}
            const updatedSettings = { ...existingSettings, ...(request.body as object) }

            const updateData: any = { settings: updatedSettings }
            if ((request.body as any)?.businessName) {
                updateData.name = (request.body as any).businessName
            }

            const updatedTenant = await prisma.tenant.update({
                where: { id: tenantId },
                data: updateData,
                select: { name: true, businessCode: true, settings: true },
            })

            const stored = (updatedTenant.settings as Record<string, any>) || {}
            return reply.send({
                message: 'Settings updated successfully.',
                settings: {
                    businessName: stored.businessName || updatedTenant.name,
                    businessEmail: stored.businessEmail,
                    businessPhone: stored.businessPhone,
                    businessAddress: stored.businessAddress,
                    taxId: stored.taxId,
                    logoUrl: stored.logoUrl,
                    refundPolicy: stored.refundPolicy,
                    promptEmailReceipt: stored.promptEmailReceipt,
                    receiptHeader: stored.receiptHeader,
                    receiptFooter: stored.receiptFooter,
                    businessCode: updatedTenant.businessCode,
                }
            })
        }
    )

    // -------------------------------------------------------------------------
    // Universal Access Engine — PATCH /tenants/settings/universal-password
    // Only SUPER_ADMIN of the tenant can set/update this password.
    // -------------------------------------------------------------------------
    server.patch(
        '/settings/universal-password',
        {
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
        },
        async (request, reply) => {
            const { tenantId, role } = request.user as any

            // Only SUPER_ADMIN may manage this
            if (role !== 'SUPER_ADMIN') {
                return reply.code(403).send({ message: 'Only Super Admins can manage the Universal Access Engine.' })
            }

            const { currentUniversalPassword, newPassword } = request.body

            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { universalPasswordHash: true },
            })

            if (!tenant) {
                return reply.code(400).send({ message: 'Tenant not found.' })
            }

            // If a universal password already exists, require the current one to change it
            if (tenant.universalPasswordHash) {
                if (!currentUniversalPassword) {
                    return reply.code(400).send({ message: 'Current universal password is required to set a new one.' })
                }
                const isValid = await bcrypt.compare(currentUniversalPassword, tenant.universalPasswordHash)
                if (!isValid) {
                    return reply.code(400).send({ message: 'Current universal password is incorrect.' })
                }
            }

            const newHash = await bcrypt.hash(newPassword, 12)

            await prisma.tenant.update({
                where: { id: tenantId },
                data: { universalPasswordHash: newHash },
            })

            console.log(`[SECURITY] Universal Access Engine password updated for tenant ${tenantId}`)

            return reply.send({ message: 'Universal Access Engine password updated successfully.' })
        }
    )

    // -------------------------------------------------------------------------
    // Check whether a universal password is already configured
    // -------------------------------------------------------------------------
    server.get(
        '/settings/universal-password/status',
        {
            schema: {
                response: {
                    200: z.object({ isConfigured: z.boolean() }),
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user as any
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { universalPasswordHash: true },
            })
            return reply.send({ isConfigured: !!tenant?.universalPasswordHash })
        }
    )

    // Helper to generate a unique public human-readable branchCode
    const generateBranchCode = async (tenantId: string, name: string, location?: string | null) => {
        let prefix = 'BR'
        const text = (location || name || '').toUpperCase()
        if (text.includes('LAGOS') || text.includes('LAG')) prefix = 'BR-LAG'
        else if (text.includes('ABUJA') || text.includes('ABJ')) prefix = 'BR-ABJ'
        else if (text.includes('IKEJA') || text.includes('IKJ')) prefix = 'BR-IKJ'
        else if (text.includes('PORT') || text.includes('PH')) prefix = 'BR-PHC'
        else if (name && name.length >= 3) prefix = `BR-${name.substring(0, 3).toUpperCase()}`

        const count = await prisma.store.count({ where: { tenantId } })
        let code = `${prefix}-${String(count + 1).padStart(2, '0')}`

        // Ensure uniqueness
        const existing = await prisma.store.findFirst({ where: { branchCode: code } })
        if (existing) {
            code = `${prefix}-${Date.now().toString().slice(-4)}`
        }
        return code
    }

    // -------------------------------------------------------------------------
    // Branches Management — GET /tenants/branches
    // -------------------------------------------------------------------------
    server.get(
        '/branches',
        async (request, reply) => {
            const { tenantId } = request.user as any
            let branches = await prisma.store.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'asc' },
                include: {
                    _count: {
                        select: { users: true, orders: true }
                    }
                }
            })

            // Backfill missing branchCodes
            for (let i = 0; i < branches.length; i++) {
                if (!branches[i].branchCode) {
                    const newCode = await generateBranchCode(tenantId, branches[i].name, branches[i].location)
                    const updated = await prisma.store.update({
                        where: { id: branches[i].id },
                        data: { branchCode: newCode }
                    })
                    branches[i].branchCode = updated.branchCode
                }
            }

            return reply.send(branches)
        }
    )

    // -------------------------------------------------------------------------
    // Branches Management — POST /tenants/branches
    // -------------------------------------------------------------------------
    server.post(
        '/branches',
        {
            schema: {
                body: z.object({
                    name: z.string().min(1, 'Branch name is required'),
                    location: z.string().nullable().optional(),
                    phone: z.string().nullable().optional(),
                    receiptHeader: z.string().nullable().optional(),
                    receiptFooter: z.string().nullable().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { tenantId, role } = request.user as any
            if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
                return reply.code(403).send({ message: 'Insufficient permissions to create a branch.' } as any)
            }
            const { name, location, phone, receiptHeader, receiptFooter } = request.body
            const branchCode = await generateBranchCode(tenantId, name, location)

            const branchSettings = (receiptHeader || receiptFooter) ? { receiptHeader, receiptFooter } : undefined

            const branch = await prisma.store.create({
                data: {
                    name,
                    location: location || null,
                    phone: phone || null,
                    tenantId,
                    branchCode,
                    status: 'ACTIVE',
                    isActive: true,
                    branchSettings,
                }
            })
            return reply.code(201).send(branch)
        }
    )

    // -------------------------------------------------------------------------
    // Branches Management — PUT /tenants/branches/:id
    // Public branchCode is strictly immutable and preserved.
    // -------------------------------------------------------------------------
    server.put(
        '/branches/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: z.object({
                    name: z.string().optional(),
                    location: z.string().nullable().optional(),
                    phone: z.string().nullable().optional(),
                    isActive: z.boolean().optional(),
                    status: z.string().optional(),
                    receiptHeader: z.string().nullable().optional(),
                    receiptFooter: z.string().nullable().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { tenantId, role } = request.user as any
            const { id } = request.params as { id: string }
            if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
                return reply.code(403).send({ message: 'Only Super Admins/Owners can edit branch configuration.' } as any)
            }
            const branch = await prisma.store.findFirst({ where: { id, tenantId } })
            if (!branch) return reply.code(404).send({ message: 'Branch not found.' } as any)

            const { name, location, phone, isActive, status, receiptHeader, receiptFooter } = request.body

            // Preserve existing branchSettings while updating receipt fields
            const existingSettings = (branch.branchSettings as Record<string, any>) || {}
            const updatedSettings = {
                ...existingSettings,
                ...(receiptHeader !== undefined ? { receiptHeader } : {}),
                ...(receiptFooter !== undefined ? { receiptFooter } : {}),
            }

            // Stripping branchCode so it remains 100% immutable
            const updateData: any = {
                ...(name !== undefined ? { name } : {}),
                ...(location !== undefined ? { location } : {}),
                ...(phone !== undefined ? { phone } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
                ...(status !== undefined ? { status } : {}),
                branchSettings: updatedSettings,
            }

            const updated = await prisma.store.update({
                where: { id },
                data: updateData,
            })
            return reply.send(updated)
        }
    )

    // -------------------------------------------------------------------------
    // Branches Management — DELETE /tenants/branches/:id (Soft-Delete Engine)
    // -------------------------------------------------------------------------
    server.delete(
        '/branches/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
            },
        },
        async (request, reply) => {
            const { tenantId, role } = request.user as any
            const { id } = request.params as { id: string }
            if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(role)) {
                return reply.code(403).send({ message: 'Only Super Admins/Owners can deactivate a branch.' } as any)
            }
            const branch = await prisma.store.findFirst({ where: { id, tenantId } })
            if (!branch) return reply.code(404).send({ message: 'Branch not found.' } as any)

            // Safety Guard: Check for active personnel bound to this branch
            const activeStaffCount = await prisma.user.count({
                where: { branchId: id, status: 'ACTIVE' }
            })

            if (activeStaffCount > 0) {
                return reply.code(409).send({
                    message: `Cannot deactivate branch "${branch.name}". There are ${activeStaffCount} active staff member(s) assigned to this branch. Please re-assign or archive personnel first.`
                } as any)
            }

            // Soft Delete Execution: Preserves historical sales, shift logs, and audit trails
            const deactivatedBranch = await prisma.store.update({
                where: { id },
                data: {
                    isActive: false,
                    status: 'DEACTIVATED'
                }
            })

            return reply.send({
                message: `Branch "${branch.name}" (${branch.branchCode || 'HQ'}) has been safely deactivated. Historical sales and audit logs are preserved.`,
                branch: deactivatedBranch
            })
        }
    )

    // -------------------------------------------------------------------------
    // Staff Permissions — PATCH /tenants/staff/:id/permissions
    // -------------------------------------------------------------------------
    server.patch(
        '/staff/:id/permissions',
        {
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
        },
        async (request, reply) => {
            const { tenantId, role } = request.user as any
            const { id } = request.params as { id: string }
            if (!['SUPER_ADMIN', 'OWNER', 'ADMIN', 'BRANCH_MANAGER'].includes(role)) {
                return reply.code(403).send({ message: 'Insufficient permissions.' } as any)
            }
            const staffMember = await prisma.user.findFirst({ where: { id, tenantId }, select: { id: true, permissions: true } })
            if (!staffMember) return reply.code(404).send({ message: 'Staff member not found.' } as any)

            // Merge incoming toggles into existing JSON permissions blob
            const existing = (staffMember.permissions as Record<string, boolean>) || {}
            const merged = { ...existing, ...request.body }

            const updated = await prisma.user.update({
                where: { id },
                data: { permissions: merged },
                select: { id: true, name: true, role: true, permissions: true }
            })
            return reply.send(updated)
        }
    )
}

