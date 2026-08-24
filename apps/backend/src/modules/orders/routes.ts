import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createOrderSchema, orderResponseSchema } from './schemas.js'
import {
    createOrder,
    getOrders,
    updateOrderStatus,
    updateOrderPaymentStatus,
    getDraftOrders,
    lockDraftOrder,
    cancelDraftOrder,
    resetFinancialRecords,
    refundOrder,
    getAnalyticsData,
    getDashboardSummary,
    sendDigitalReceiptEmail
} from './service.js'
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
                    branchId: z.string().optional(),
                    search: z.string().optional(),
                    paymentStatus: z.string().optional(),
                    paymentMethod: z.string().optional(),
                    cashierId: z.string().optional(),
                    customerId: z.string().optional(),
                }),
                response: {
                    200: z.array(orderResponseSchema),
                },
            },
        },
        async (request) => {
            const { storeId, branchId, search, paymentStatus, paymentMethod, cashierId, customerId } = request.query as {
                storeId?: string
                branchId?: string
                search?: string
                paymentStatus?: string
                paymentMethod?: string
                cashierId?: string
                customerId?: string
            }
            const effectiveStoreId = storeId || branchId
            const { tenantId } = request.user as any
            return getOrders(effectiveStoreId, tenantId, { search, paymentStatus, paymentMethod, cashierId, customerId })
        }
    )

    // Dashboard Summary endpoint — returns pre-computed net sales & refunds
    server.get(
        '/dashboard-summary',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                    branchId: z.string().optional(),
                    cashierId: z.string().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { storeId, branchId, cashierId } = request.query as { storeId?: string; branchId?: string; cashierId?: string }
            const effectiveStoreId = storeId || branchId
            const { tenantId, role, id: userId } = request.user as any
            
            // If cashier role, scope to their own transactions if not elevated
            const isElevated = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN'].includes(role)
            const targetCashierId = !isElevated ? userId : cashierId

            const summary = await getDashboardSummary(effectiveStoreId, tenantId, targetCashierId)
            return reply.send(summary)
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
                    branchId: z.string().optional(),
                    cashierId: z.string().optional(),
                }),
                response: {
                    200: z.array(orderResponseSchema),
                },
            },
        },
        async (request) => {
            const { storeId, branchId, cashierId } = request.query as { storeId?: string; branchId?: string; cashierId?: string }
            const effectiveStoreId = storeId || branchId
            return getDraftOrders(effectiveStoreId, cashierId)
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

    // Admin-only: Reset all financial records (non-draft orders)
    server.post(
        '/reset-financials',
        {
            schema: {
                body: z.object({
                    storeId: z.string().optional(),
                    branchId: z.string().optional(),
                    confirm: z.literal(true),
                }),
            },
        },
        async (request, reply) => {
            const { storeId, branchId } = request.body as { storeId?: string; branchId?: string; confirm: true }
            const effectiveStoreId = storeId || branchId
            const result = await resetFinancialRecords(effectiveStoreId)
            app.broadcast('FINANCIAL_RESET', { storeId: effectiveStoreId, deleted: result.deleted })
            return reply.send(result)
        }
    )

    // Analytics: GET /orders/analytics
    server.get(
        '/analytics',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                    branchId: z.string().optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { storeId, branchId, startDate, endDate } = request.query as { storeId?: string; branchId?: string; startDate?: string; endDate?: string }
            const effectiveStoreId = storeId || branchId
            const { tenantId } = request.user as any
            const start = startDate ? new Date(startDate) : undefined
            const end = endDate ? new Date(endDate) : undefined
            const data = await getAnalyticsData(effectiveStoreId, tenantId, start, end)
            return reply.send(data)
        }
    )

    // Refund: POST /orders/:id/refund
    server.post(
        '/:id/refund',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: z.object({
                    reason: z.string().min(1),
                    managerPin: z.string().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string }
            const { reason } = request.body as { reason: string; managerPin?: string }
            const { id: userId } = request.user as any
            try {
                const result = await refundOrder(id, userId, reason)
                app.broadcast('ORDER_UPDATED', { id, paymentStatus: 'REFUNDED' })
                return reply.send(result)
            } catch (err: any) {
                return reply.code(400).send({ message: err.message })
            }
        }
    )

    // Email Digital Receipt: POST /orders/:id/email-receipt
    server.post(
        '/:id/email-receipt',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: z.object({
                    email: z.string().email(),
                    saveToCrm: z.boolean().optional(),
                    customerId: z.string().optional(),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string }
            const { email, saveToCrm, customerId } = request.body as { email: string; saveToCrm?: boolean; customerId?: string }
            try {
                const result = await sendDigitalReceiptEmail(id, email, saveToCrm, customerId)
                return reply.send(result)
            } catch (err: any) {
                return reply.code(500).send({ message: err.message || 'Failed to send digital receipt.' })
            }
        }
    )
}
