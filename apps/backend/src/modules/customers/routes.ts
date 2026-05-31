import { FastifyInstance } from 'fastify'
import { prisma } from '@demegapos/db'

export default async function customerRoutes(server: FastifyInstance) {
    server.get('/', async (request: any) => {
        return prisma.customer.findMany({
            where: { tenantId: request.user.tenantId },
            orderBy: { name: 'asc' }
        })
    })

    server.post('/', async (request: any) => {
        const { name, email, phone } = request.body
        return prisma.customer.create({
            data: {
                name,
                email,
                phone,
                tenantId: request.user.tenantId
            }
        })
    })

    server.get('/:id', async (request: any) => {
        return prisma.customer.findUnique({
            where: { id: request.params.id }
        })
    })

    server.put('/:id', async (request: any) => {
        const { name, email, phone, walletBalance } = request.body
        return prisma.customer.update({
            where: { id: request.params.id, tenantId: request.user.tenantId },
            data: {
                name,
                email,
                phone,
                walletBalance: walletBalance !== undefined ? parseFloat(walletBalance) : undefined
            }
        })
    })

    server.delete('/:id', async (request: any, reply) => {
        await prisma.customer.delete({
            where: { id: request.params.id, tenantId: request.user.tenantId }
        })
        return reply.code(204).send()
    })
}
