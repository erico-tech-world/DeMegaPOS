import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
    createIntegrationSchema,
    integrationResponseSchema,
    mapTerminalTransactionSchema,
    manualPaymentSchema,
} from './schemas.js'
import {
    getTenantIntegrations,
    createTenantIntegration,
    deleteTenantIntegration,
    getUnmappedMonnifyTransactions,
    mapTerminalTransactionToOrder,
    recordManualPosDevice,
} from './service.js'

export default async function integrationRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()
    const authHook = (app as any).authenticate ? [(app as any).authenticate] : []

    // Get all integrations for tenant
    server.get(
        '/',
        {
            preHandler: authHook,
            schema: {
                response: {
                    200: z.array(integrationResponseSchema),
                },
            },
        },
        async (request) => {
            const tenantId = (request.user as any)?.tenantId || 'test-tenant'
            return getTenantIntegrations(tenantId)
        }
    )

    // Create integration
    server.post(
        '/',
        {
            preHandler: authHook,
            schema: {
                body: createIntegrationSchema,
                response: {
                    201: integrationResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any)?.tenantId || 'test-tenant'
            const integration = await createTenantIntegration(tenantId, request.body)
            return reply.code(201).send(integration)
        }
    )

    // Delete integration
    server.delete(
        '/:id',
        {
            preHandler: authHook,
            schema: {
                params: z.object({
                    id: z.string(),
                }),
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any)?.tenantId || 'test-tenant'
            const { id } = request.params as { id: string }
            await deleteTenantIntegration(tenantId, id)
            return reply.code(204).send()
        }
    )

    // Get unmapped Monnify transactions
    server.get(
        '/unmapped-transactions',
        {
            preHandler: authHook,
            schema: {
                querystring: z.object({
                    integrationId: z.string().optional(),
                }),
            },
        },
        async (request) => {
            const tenantId = (request.user as any)?.tenantId || 'test-tenant'
            const { integrationId } = request.query as { integrationId?: string }
            return getUnmappedMonnifyTransactions(tenantId, integrationId)
        }
    )

    // Map a Monnify terminal transaction to an order
    server.post(
        '/orders/:orderId/map-terminal',
        {
            preHandler: authHook,
            schema: {
                params: z.object({
                    orderId: z.string(),
                }),
                body: mapTerminalTransactionSchema,
            },
        },
        async (request) => {
            const { orderId } = request.params as { orderId: string }
            const result = await mapTerminalTransactionToOrder(orderId, request.body)
            app.broadcast('ORDER_UPDATED', result.order)
            app.broadcast('PAYMENT_SUCCESS', result.order)
            return result
        }
    )

    // Process manual offline payment and record POS device type
    server.post(
        '/orders/:orderId/manual-payment',
        {
            preHandler: authHook,
            schema: {
                params: z.object({
                    orderId: z.string(),
                }),
                body: manualPaymentSchema,
            },
        },
        async (request) => {
            const { orderId } = request.params as { orderId: string }
            const { posDeviceType } = request.body
            const updatedOrder = await recordManualPosDevice(orderId, posDeviceType)
            app.broadcast('ORDER_UPDATED', updatedOrder)
            app.broadcast('PAYMENT_SUCCESS', updatedOrder)
            return updatedOrder
        }
    )
}
