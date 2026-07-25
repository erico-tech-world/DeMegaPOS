import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createOrderSchema, orderResponseSchema } from './schemas.js'
import { createOrder, getOrders, updateOrderStatus, updateOrderPaymentStatus, getDraftOrders, lockDraftOrder, cancelDraftOrder } from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

export default async function orderRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    server.post(
        '/',
        {
            schema: {
                body: createOrderSchema,
                response: {
                    201: orderResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const order = await createOrder(request.body)
            // Broadcast the new order event
            app.broadcast('ORDER_CREATED', order)
            return reply.code(201).send(order)
        }
    )

    server.get(
        '/',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                }),
                response: {
                    200: z.array(orderResponseSchema),
                },
            },
        },
        async (request) => {
            const { storeId } = request.query as { storeId: string }
            return getOrders(storeId)
        }
    )

    server.patch(
        '/:id/status',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                body: z.object({
                    status: z.string(),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as { id: string }
            const { status } = request.body as { status: string }
            const updatedOrder = await updateOrderStatus(id, status)
            if (updatedOrder) {
                app.broadcast('ORDER_UPDATED', updatedOrder)
            }
            return updatedOrder
        }
    )

    server.patch(
        '/:id/payment-status',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                body: z.object({
                    paymentStatus: z.enum(['PENDING', 'SUCCESS', 'FAILED']),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as { id: string }
            const { paymentStatus } = request.body as { paymentStatus: string }
            const updatedOrder = await updateOrderPaymentStatus(id, paymentStatus)
            if (updatedOrder) {
                app.broadcast('ORDER_UPDATED', updatedOrder)
                if (paymentStatus === 'SUCCESS') {
                    app.broadcast('PAYMENT_SUCCESS', updatedOrder)
                }
            }
            return updatedOrder
        }
    )

    // Draft Orders endpoints
    server.get(
        '/drafts',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                    cashierId: z.string().optional(),
                }),
                response: {
                    200: z.array(orderResponseSchema),
                },
            },
        },
        async (request) => {
            const { storeId, cashierId } = request.query as { storeId?: string; cashierId?: string }
            return getDraftOrders(storeId, cashierId)
        }
    )

    server.patch(
        '/drafts/:id/lock',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as { id: string }
            const lockedOrder = await lockDraftOrder(id)
            if (lockedOrder) {
                app.broadcast('ORDER_UPDATED', lockedOrder)
            }
            return lockedOrder
        }
    )

    server.delete(
        '/drafts/:id',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
            },
        },
        async (request) => {
            const { id } = request.params as { id: string }
            await cancelDraftOrder(id)
            app.broadcast('ORDER_UPDATED', { id, deleted: true })
            return { success: true }
        }
    )
}

