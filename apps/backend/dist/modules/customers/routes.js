import { prisma } from '@demegapos/db';
export default async function customerRoutes(server) {
    server.get('/', async () => {
        return prisma.customer.findMany({
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
}
