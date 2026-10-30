import { FastifyInstance } from 'fastify'
import { prisma } from '@demegapos/db'

// Roles that bypass branch-level isolation
const ELEVATED_ROLES = ['SUPER_ADMIN'] as const
const isElevated = (role: string) => ELEVATED_ROLES.includes(role as any)

export default async function customerRoutes(server: FastifyInstance) {
    // -------------------------------------------------------------------------
    // GET /customers — Branch-scoped list
    // SUPER_ADMIN → all tenant customers
    // Standard staff → own branch customers + global (isGlobal: true) customers
    // -------------------------------------------------------------------------
    server.get('/', async (request: any) => {
        const { search } = (request.query || {}) as { search?: string }
        const { tenantId, role, branchId: userBranchId } = request.user

        const whereClause: any = { tenantId }

        // Branch isolation for non-elevated roles
        if (!isElevated(role)) {
            if (userBranchId) {
                whereClause.OR = [
                    { branchId: userBranchId },
                    { isGlobal: true },
                ]
            } else {
                // No branchId on user = omni-branch non-super-admin (edge case): show globals only
                whereClause.isGlobal = true
            }
        }

        if (search && search.trim()) {
            const q = search.trim()
            const searchCondition = [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
                { id: { contains: q, mode: 'insensitive' } },
            ]
            // Merge search with existing OR clause if present
            if (whereClause.OR) {
                // (branch filter) AND (search filter)
                whereClause.AND = [
                    { OR: whereClause.OR },
                    { OR: searchCondition },
                ]
                delete whereClause.OR
            } else {
                whereClause.OR = searchCondition
            }
        }

        return prisma.customer.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { orders: true }
                }
            },
            orderBy: { name: 'asc' }
        })
    })

    // -------------------------------------------------------------------------
    // POST /customers — Auto-tag branchId from authenticated user
    // Global customers (isGlobal: true) can only be created by SUPER_ADMIN
    // -------------------------------------------------------------------------
    server.post('/', async (request: any, reply) => {
        const { name, email, phone, isGlobal } = request.body
        const { tenantId, role, branchId: userBranchId } = request.user

        // Only SUPER_ADMIN may create global customers
        if (isGlobal && !isElevated(role)) {
            return reply.code(403).send({ message: 'Only Super Admins can create global customers.' })
        }

        return prisma.customer.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                isGlobal: isGlobal === true && isElevated(role) ? true : false,
                tenantId,
                branchId: isGlobal ? null : (userBranchId || null),
            }
        })
    })

    // -------------------------------------------------------------------------
    // GET /customers/:id — Tenant-scoped (SUPER_ADMIN unrestricted)
    // -------------------------------------------------------------------------
    server.get('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string }
        const { tenantId, role, branchId: userBranchId } = request.user

        const customer = await prisma.customer.findUnique({ where: { id } })
        if (!customer || customer.tenantId !== tenantId) {
            return reply.code(404).send({ message: 'Customer not found.' })
        }

        // Branch isolation check for single-branch staff
        if (!isElevated(role) && !customer.isGlobal && userBranchId && customer.branchId !== userBranchId) {
            return reply.code(403).send({ message: 'Access denied: This customer belongs to a different branch.' })
        }

        return customer
    })

    // -------------------------------------------------------------------------
    // PUT /customers/:id — Branch-scoped update; isGlobal customers: SUPER_ADMIN only
    // -------------------------------------------------------------------------
    server.put('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string }
        const { name, email, phone, walletBalance } = request.body
        const { tenantId, role, branchId: userBranchId } = request.user

        const customer = await prisma.customer.findUnique({ where: { id } })
        if (!customer || customer.tenantId !== tenantId) {
            return reply.code(404).send({ message: 'Customer not found.' })
        }

        // isGlobal customers can only be edited by SUPER_ADMIN
        if (customer.isGlobal && !isElevated(role)) {
            return reply.code(403).send({ message: 'Global customers can only be edited by Super Admins.' })
        }

        // Branch isolation for single-branch staff on non-global customers
        if (!isElevated(role) && !customer.isGlobal && userBranchId && customer.branchId !== userBranchId) {
            return reply.code(403).send({ message: 'Access denied: This customer belongs to a different branch.' })
        }

        return prisma.customer.update({
            where: { id },
            data: {
                name,
                email: email || null,
                phone: phone || null,
                walletBalance: walletBalance !== undefined ? parseFloat(walletBalance) : undefined
            }
        })
    })

    // -------------------------------------------------------------------------
    // DELETE /customers/:id — Branch-scoped; isGlobal customers: SUPER_ADMIN only
    // -------------------------------------------------------------------------
    server.delete('/:id', async (request: any, reply) => {
        const { id } = request.params as { id: string }
        const { tenantId, role, branchId: userBranchId } = request.user

        const customer = await prisma.customer.findUnique({ where: { id } })
        if (!customer || customer.tenantId !== tenantId) {
            return reply.code(404).send({ message: 'Customer not found.' })
        }

        // isGlobal customers can only be deleted by SUPER_ADMIN
        if (customer.isGlobal && !isElevated(role)) {
            return reply.code(403).send({ message: 'Global customers can only be deleted by Super Admins.' })
        }

        // Branch isolation for single-branch staff on non-global customers
        if (!isElevated(role) && !customer.isGlobal && userBranchId && customer.branchId !== userBranchId) {
            return reply.code(403).send({ message: 'Access denied: This customer belongs to a different branch.' })
        }

        await prisma.customer.delete({ where: { id } })
        return reply.code(204).send()
    })
}
