import { z } from 'zod';
import { createOrderSchema, orderResponseSchema } from './schemas.js';
import { createOrder, getOrders, updateOrderStatus, updateOrderPaymentStatus } from './service.js';
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
            querystring: z.object({
                storeId: z.string().optional(),
            }),
            response: {
                200: z.array(orderResponseSchema),
            },
        },
    }, async (request) => {
        const { storeId } = request.query;
        return getOrders(storeId);
    });
    server.patch('/:id/status', {
        schema: {
            params: z.object({
                id: z.string(),
            }),
            body: z.object({
                status: z.string(),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        const { status } = request.body;
        const updatedOrder = await updateOrderStatus(id, status);
        if (updatedOrder) {
            app.broadcast('ORDER_UPDATED', updatedOrder);
        }
        return updatedOrder;
    });
    server.patch('/:id/payment-status', {
        schema: {
            params: z.object({
                id: z.string(),
            }),
            body: z.object({
                paymentStatus: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        const { paymentStatus } = request.body;
        const updatedOrder = await updateOrderPaymentStatus(id, paymentStatus);
        if (updatedOrder) {
            app.broadcast('ORDER_UPDATED', updatedOrder);
            if (paymentStatus === 'SUCCESS') {
                app.broadcast('PAYMENT_SUCCESS', updatedOrder);
            }
        }
        return updatedOrder;
    });
}
