import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createOrderSchema, orderResponseSchema } from './schemas.js'
import {
    createOrder,
    getOrders,
    getOrderAggregates,
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
                    q: z.string().optional(),
                    search: z.string().optional(),
                    status: z.string().optional(),
                    orderStatus: z.string().optional(),
                    orderStatuses: z.string().optional(),
                    fulfillmentStatus: z.string().optional(),
                    paymentStatus: z.string().optional(),
                    paymentStatuses: z.string().optional(),
                    paymentMethod: z.string().optional(),
                    paymentMethods: z.string().optional(),
                    cashierId: z.string().optional(),
                    staffId: z.string().optional(),
                    customerId: z.string().optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                    dateFrom: z.string().optional(),
                    dateTo: z.string().optional(),
                    itemName: z.string().optional(),
                    categoryId: z.string().optional(),
                    productId: z.string().optional(),
                    minUnitPrice: z.string().optional(),
                    maxUnitPrice: z.string().optional(),
                    minItemQty: z.string().optional(),
                    maxItemQty: z.string().optional(),
                    minTotal: z.string().optional(),
                    maxTotal: z.string().optional(),
                    page: z.string().optional(),
                    limit: z.string().optional(),
                    withMeta: z.string().optional(),
                }),
                response: {
                    200: z.union([
                        z.array(orderResponseSchema),
                        z.object({
                            data: z.array(orderResponseSchema),
                            meta: z.object({
                                totalCount: z.number(),
                                totalRevenue: z.number(),
                                productUnitsSold: z.number(),
                                productRevenue: z.number(),
                            })
                        })
                    ]),
                },
            },
        },
        async (request, reply) => {
            const query = request.query as any
            const effectiveStoreId = query.storeId || query.branchId
            const { tenantId } = request.user as any

            const orderStatuses = query.orderStatuses ? query.orderStatuses.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined
            const paymentStatuses = query.paymentStatuses ? query.paymentStatuses.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined
            const paymentMethods = query.paymentMethods ? query.paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined

            const filters = {
                q: query.q || query.search,
                search: query.search || query.q,
                orderStatus: query.orderStatus || query.status,
                status: query.status || query.orderStatus,
                orderStatuses,
                fulfillmentStatus: query.fulfillmentStatus,
                paymentStatus: query.paymentStatus,
                paymentStatuses,
                paymentMethod: query.paymentMethod,
                paymentMethods,
                cashierId: query.cashierId || query.staffId,
                staffId: query.staffId || query.cashierId,
                customerId: query.customerId,
                startDate: query.startDate || query.dateFrom,
                endDate: query.endDate || query.dateTo,
                dateFrom: query.dateFrom || query.startDate,
                dateTo: query.dateTo || query.endDate,
                itemName: query.itemName,
                categoryId: query.categoryId,
                productId: query.productId,
                minUnitPrice: query.minUnitPrice !== undefined && query.minUnitPrice !== '' ? Number(query.minUnitPrice) : undefined,
                maxUnitPrice: query.maxUnitPrice !== undefined && query.maxUnitPrice !== '' ? Number(query.maxUnitPrice) : undefined,
                minItemQty: query.minItemQty !== undefined && query.minItemQty !== '' ? Number(query.minItemQty) : undefined,
                maxItemQty: query.maxItemQty !== undefined && query.maxItemQty !== '' ? Number(query.maxItemQty) : undefined,
                minTotal: query.minTotal !== undefined && query.minTotal !== '' ? Number(query.minTotal) : undefined,
                maxTotal: query.maxTotal !== undefined && query.maxTotal !== '' ? Number(query.maxTotal) : undefined,
                page: query.page !== undefined && query.page !== '' ? Number(query.page) : undefined,
                limit: query.limit !== undefined && query.limit !== '' ? Number(query.limit) : undefined,
            }

            const [orders, aggregates] = await Promise.all([
                getOrders(effectiveStoreId, tenantId, filters),
                getOrderAggregates(effectiveStoreId, tenantId, filters)
            ])

            reply.header('X-Total-Count', aggregates.totalCount.toString())
            reply.header('X-Total-Revenue', aggregates.totalRevenue.toString())
            reply.header('X-Product-Units-Sold', aggregates.productUnitsSold.toString())
            reply.header('X-Product-Revenue', aggregates.productRevenue.toString())

            if (query.withMeta === 'true') {
                return reply.send({
                    data: orders,
                    meta: aggregates
                })
            }

            return reply.send(orders)
        }
    )

    // Aggregate metrics endpoint: GET /orders/summary
    server.get(
        '/summary',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                    branchId: z.string().optional(),
                    q: z.string().optional(),
                    search: z.string().optional(),
                    status: z.string().optional(),
                    orderStatus: z.string().optional(),
                    orderStatuses: z.string().optional(),
                    fulfillmentStatus: z.string().optional(),
                    paymentStatus: z.string().optional(),
                    paymentStatuses: z.string().optional(),
                    paymentMethod: z.string().optional(),
                    paymentMethods: z.string().optional(),
                    cashierId: z.string().optional(),
                    staffId: z.string().optional(),
                    customerId: z.string().optional(),
                    startDate: z.string().optional(),
                    endDate: z.string().optional(),
                    dateFrom: z.string().optional(),
                    dateTo: z.string().optional(),
                    itemName: z.string().optional(),
                    categoryId: z.string().optional(),
                    productId: z.string().optional(),
                    minUnitPrice: z.string().optional(),
                    maxUnitPrice: z.string().optional(),
                    minItemQty: z.string().optional(),
                    maxItemQty: z.string().optional(),
                    minTotal: z.string().optional(),
                    maxTotal: z.string().optional(),
                }),
                response: {
                    200: z.object({
                        totalCount: z.number(),
                        totalRevenue: z.number(),
                        productUnitsSold: z.number(),
                        productRevenue: z.number(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const query = request.query as any
            const effectiveStoreId = query.storeId || query.branchId
            const { tenantId } = request.user as any

            const orderStatuses = query.orderStatuses ? query.orderStatuses.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined
            const paymentStatuses = query.paymentStatuses ? query.paymentStatuses.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined
            const paymentMethods = query.paymentMethods ? query.paymentMethods.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined

            const filters = {
                q: query.q || query.search,
                search: query.search || query.q,
                orderStatus: query.orderStatus || query.status,
                status: query.status || query.orderStatus,
                orderStatuses,
                fulfillmentStatus: query.fulfillmentStatus,
                paymentStatus: query.paymentStatus,
                paymentStatuses,
                paymentMethod: query.paymentMethod,
                paymentMethods,
                cashierId: query.cashierId || query.staffId,
                staffId: query.staffId || query.cashierId,
                customerId: query.customerId,
                startDate: query.startDate || query.dateFrom,
                endDate: query.endDate || query.dateTo,
                dateFrom: query.dateFrom || query.startDate,
                dateTo: query.dateTo || query.endDate,
                itemName: query.itemName,
                categoryId: query.categoryId,
                productId: query.productId,
                minUnitPrice: query.minUnitPrice !== undefined && query.minUnitPrice !== '' ? Number(query.minUnitPrice) : undefined,
                maxUnitPrice: query.maxUnitPrice !== undefined && query.maxUnitPrice !== '' ? Number(query.maxUnitPrice) : undefined,
                minItemQty: query.minItemQty !== undefined && query.minItemQty !== '' ? Number(query.minItemQty) : undefined,
                maxItemQty: query.maxItemQty !== undefined && query.maxItemQty !== '' ? Number(query.maxItemQty) : undefined,
                minTotal: query.minTotal !== undefined && query.minTotal !== '' ? Number(query.minTotal) : undefined,
                maxTotal: query.maxTotal !== undefined && query.maxTotal !== '' ? Number(query.maxTotal) : undefined,
            }

            const aggregates = await getOrderAggregates(effectiveStoreId, tenantId, filters)
            return reply.send(aggregates)
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
