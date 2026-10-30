import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
    createIntegrationSchema,
    mapTerminalTransactionSchema,
    manualPaymentSchema
} from './schemas.js'
import {
    getTenantIntegrations,
    createTenantIntegration,
    deleteTenantIntegration,
    getUnmappedMonnifyTransactions,
    mapTerminalTransactionToOrder,
    recordManualPosDevice
} from './service.js'

export default async function integrationRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    // Get all integrations for logged in tenant
    server.get('/', async (request, reply) => {
        const user = (request as any).user
        const tenantId = user?.tenantId || 'test-tenant'
        const integrations = await getTenantIntegrations(tenantId)
        return reply.send(integrations)
    })

    // Create integration
    server.post(
        '/',
        {
            schema: {
                body: createIntegrationSchema
            }
        },
        async (request, reply) => {
            const user = (request as any).user
            const tenantId = user?.tenantId || 'test-tenant'
            const integration = await createTenantIntegration(tenantId, request.body)
            return reply.code(201).send(integration)
        }
    )

    // Delete integration
    server.delete(
        '/:id',
        {
            schema: {
                params: z.object({
                    id: z.string()
                })
            }
        },
        async (request, reply) => {
            const user = (request as any).user
            const tenantId = user?.tenantId || 'test-tenant'
            const { id } = request.params as { id: string }
            await deleteTenantIntegration(tenantId, id)
            return reply.send({ success: true })
        }
    )

    // Get unmapped transactions from Monnify API
    server.get('/unmapped-transactions', async (request, reply) => {
        const user = (request as any).user
        const tenantId = user?.tenantId || 'test-tenant'
        const { integrationId } = request.query as { integrationId?: string }
        const transactions = await getUnmappedMonnifyTransactions(tenantId, integrationId)
        return reply.send(transactions)
    })

    // Map terminal transaction to an order
    server.post(
        '/orders/:orderId/map-terminal',
        {
            schema: {
                params: z.object({
                    orderId: z.string()
                }),
                body: mapTerminalTransactionSchema
            }
        },
        async (request, reply) => {
            const { orderId } = request.params as { orderId: string }
            const result = await mapTerminalTransactionToOrder(orderId, request.body)
            app.broadcast('ORDER_UPDATED', result.order)
            app.broadcast('PAYMENT_SUCCESS', result.order)
            return reply.send(result)
        }
    )

    // Complete manual POS payment
    server.post(
        '/orders/:orderId/manual-payment',
        {
            schema: {
                params: z.object({
                    orderId: z.string()
                }),
                body: manualPaymentSchema
            }
        },
        async (request, reply) => {
            const { orderId } = request.params as { orderId: string }
            const { posDeviceType } = request.body as { posDeviceType: string }
            const updatedOrder = await recordManualPosDevice(orderId, posDeviceType)
            app.broadcast('ORDER_UPDATED', updatedOrder)
            app.broadcast('PAYMENT_SUCCESS', updatedOrder)
            return reply.send(updatedOrder)
        }
    )
}
