import '@fastify/jwt'

declare module '@fastify/jwt' {
    interface FastifyJWT {
        user: {
            id: string
            email?: string | null
            phone?: string | null
            tenantId: string
            role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'INVENTORY_MANAGER' | 'CASHIER'
            branchId?: string | null
        }
    }
}
