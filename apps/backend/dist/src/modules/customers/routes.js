import { prisma } from '@demegapos/db';
export default async function customerRoutes(server) {
    server.get('/', async (request) => {
        return prisma.customer.findMany({
            where: { tenantId: request.user.tenantId },
            orderBy: { name: 'asc' }
        });
    });
    server.post('/', async (request) => {
        const { name, email, phone } = request.body;
        return prisma.customer.create({
            data: {
                name,
                email,
                phone,
                tenantId: request.user.tenantId
            }
        });
    });
    server.get('/:id', async (request) => {
        return prisma.customer.findUnique({
            where: { id: request.params.id }
        });
    });
    server.put('/:id', async (request) => {
        const { name, email, phone, walletBalance } = request.body;
        return prisma.customer.update({
            where: { id: request.params.id, tenantId: request.user.tenantId },
            data: {
                name,
                email,
                phone,
                walletBalance: walletBalance !== undefined ? parseFloat(walletBalance) : undefined
            }
        });
    });
    server.delete('/:id', async (request, reply) => {
        await prisma.customer.delete({
            where: { id: request.params.id, tenantId: request.user.tenantId }
        });
        return reply.code(204).send();
    });
}
