import { createTenantSchema, tenantResponseSchema } from './schemas.js';
import { createTenant, getTenants, getTenantById } from './service.js';
export default async function tenantRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/', {
        schema: {
            body: createTenantSchema,
            response: {
                201: tenantResponseSchema,
            },
        },
    }, async (request, reply) => {
        const tenant = await createTenant(request.body);
        return reply.code(201).send(tenant);
    });
    server.get('/', {
        schema: {
            response: {
                200: {
                    type: 'array',
                    items: tenantResponseSchema,
                },
            },
        },
    }, async () => {
        return getTenants();
    });
    server.get('/:id', {
        schema: {
            params: {
                id: { type: 'string' },
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
}
