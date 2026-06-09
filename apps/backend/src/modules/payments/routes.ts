import { FastifyInstance } from 'fastify'
import { initiatePaymentSchema, paymentResponseSchema } from './schemas.js'
import { initiatePayment, handlePaymentWebhook } from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

export default async function paymentRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    server.post(
        '/initiate',
        {
            schema: {
                body: initiatePaymentSchema,
                response: {
                    200: paymentResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const result = await initiatePayment(request.body)
            return reply.code(200).send(result)
        }
    )

    server.post(
        '/webhook/:provider',
        async (request, reply) => {
            const { provider } = request.params as { provider: string }
            const updatedOrder: any = await handlePaymentWebhook(provider, request.body)
            if (updatedOrder) {
                app.broadcast('ORDER_UPDATED', updatedOrder)
                if (updatedOrder.paymentStatus === 'SUCCESS') {
                    app.broadcast('PAYMENT_SUCCESS', updatedOrder)
                }
            }
            return reply.code(200).send({ status: 'OK' })
        }
    )
}
