import { z } from 'zod';
import { createOrderSchema, orderResponseSchema } from './schemas.js';
import { createOrder, getOrders, updateOrderStatus, updateOrderPaymentStatus, getDraftOrders, lockDraftOrder, cancelDraftOrder, resetFinancialRecords, refundOrder, getAnalyticsData } from './service.js';
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
    // Draft Orders endpoints
    server.get('/drafts', {
        schema: {
            querystring: z.object({
                storeId: z.string().optional(),
                cashierId: z.string().optional(),
            }),
            response: {
                200: z.array(orderResponseSchema),
            },
        },
    }, async (request) => {
        const { storeId, cashierId } = request.query;
        return getDraftOrders(storeId, cashierId);
    });
    server.patch('/drafts/:id/lock', {
        schema: {
            params: z.object({
                id: z.string(),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        const lockedOrder = await lockDraftOrder(id);
        if (lockedOrder) {
            app.broadcast('ORDER_UPDATED', lockedOrder);
        }
        return lockedOrder;
    });
    server.delete('/drafts/:id', {
        schema: {
            params: z.object({
                id: z.string(),
            }),
        },
    }, async (request) => {
        const { id } = request.params;
        await cancelDraftOrder(id);
        app.broadcast('ORDER_UPDATED', { id, deleted: true });
        return { success: true };
    });
    // Admin-only: Reset all financial records (non-draft orders)
    server.post('/reset-financials', {
        schema: {
            body: z.object({
                storeId: z.string().optional(),
                confirm: z.literal(true),
            }),
        },
    }, async (request, reply) => {
        const { storeId } = request.body;
        const result = await resetFinancialRecords(storeId);
        app.broadcast('FINANCIAL_RESET', { storeId, deleted: result.deleted });
        return reply.send(result);
    });
    // Analytics: GET /orders/analytics
    server.get('/analytics', {
        schema: {
            querystring: z.object({
                storeId: z.string().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const { storeId, startDate, endDate } = request.query;
        const { tenantId } = request.user;
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const data = await getAnalyticsData(storeId, tenantId, start, end);
        return reply.send(data);
    });
    // Refund: POST /orders/:id/refund
    server.post('/:id/refund', {
        schema: {
            params: z.object({ id: z.string() }),
            body: z.object({
                reason: z.string().min(1),
                managerPin: z.string().optional(),
            }),
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const { reason } = request.body;
        const { id: userId } = request.user;
        try {
            const result = await refundOrder(id, userId, reason);
            app.broadcast('ORDER_UPDATED', { id, paymentStatus: 'REFUNDED' });
            return reply.send(result);
        }
        catch (err) {
            return reply.code(400).send({ message: err.message });
        }
    });
}
