import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createOrderSchema, orderResponseSchema } from './schemas.js'
import { createOrder, getOrders, updateOrderStatus } from './service.js'
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
            return updateOrderStatus(id, status)
        }
    )
}
