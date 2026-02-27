import { createOrderSchema, orderResponseSchema } from './schemas.js';
import { createOrder, getOrders, updateOrderStatus } from './service.js';
export default async function orderRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/', {
        schema: {
            body: createOrderSchema,
            response: {
                201: orderResponseSchema,
            },
        },
    }, async (request, reply) => {
        const order = await createOrder(request.body);
        // Broadcast the new order event
        app.broadcast('ORDER_CREATED', order);
        return reply.code(201).send(order);
    });
    server.get('/', {
        schema: {
            querystring: {
                storeId: { type: 'string' },
            },
            response: {
                200: {
                    type: 'array',
                    items: orderResponseSchema,
                },
            },
        },
    }, async (request) => {
        const { storeId } = request.query;
        return getOrders(storeId);
    });
    server.patch('/:id/status', {
        schema: {
            params: {
                id: { type: 'string' },
            },
            body: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                },
                required: ['status'],
            },
        },
    }, async (request) => {
        const { id } = request.params;
        const { status } = request.body;
        return updateOrderStatus(id, status);
    });
}
