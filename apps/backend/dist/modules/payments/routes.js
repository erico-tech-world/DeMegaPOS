import { initiatePaymentSchema, paymentResponseSchema } from './schemas.js';
import { initiatePayment, handlePaymentWebhook } from './service.js';
export default async function paymentRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/initiate', {
        schema: {
            body: initiatePaymentSchema,
            response: {
                200: paymentResponseSchema,
            },
        },
    }, async (request, reply) => {
        const result = await initiatePayment(request.body);
        return reply.code(200).send(result);
    });
    server.post('/webhook/:provider', async (request, reply) => {
        const { provider } = request.params;
        const updatedOrder = await handlePaymentWebhook(provider, request.body);
        if (updatedOrder) {
            app.broadcast('ORDER_UPDATED', updatedOrder);
            if (updatedOrder.paymentStatus === 'SUCCESS') {
                app.broadcast('PAYMENT_SUCCESS', updatedOrder);
            }
        }
        return reply.code(200).send({ status: 'OK' });
    });
}
