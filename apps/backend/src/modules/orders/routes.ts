import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createOrderSchema, orderResponseSchema } from './schemas.js'
import {
    createOrder,
    getOrders,
    getOrderAggregates,
    updateOrderStatus,
    updateOrderPaymentStatus,
    updateOrderFulfillmentStatus,
    payOrder,
    getDraftOrders,
    lockDraftOrder,
    cancelDraftOrder,
    cancelAllDraftOrders,
    resetFinancialRecords,
    refundOrder,
    getAnalyticsData,
    getDashboardSummary,
    sendDigitalReceiptEmail
} from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

export default async function orderRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    function resolveEffectiveStoreId(user: any, requestedStoreId?: string): { storeId?: string; isForbidden?: boolean } {
        const userRole = user?.role || ''
        const isElevated = ['SUPER_ADMIN', 'OWNER', 'REGIONAL_MANAGER'].includes(userRole) || Boolean(user?.hasMultiBranchAccess)
        if (isElevated) {
            return { storeId: requestedStoreId }
        }
        const userBranchId = user?.branchId
        if (userBranchId) {
            if (requestedStoreId && requestedStoreId !== 'ALL' && requestedStoreId !== 'all' && requestedStoreId.trim() !== '' && requestedStoreId !== userBranchId) {
                return { storeId: userBranchId, isForbidden: true }
            }
            return { storeId: userBranchId }
        }
        return { storeId: requestedStoreId }
    }

    server.post(
        '/',
        {
            schema: {
                body: createOrderSchema,
                response: {
                    201: orderResponseSchema,
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const body = request.body as any
            const { role, branchId: userBranchId } = request.user as any
            const isElevated = ['SUPER_ADMIN', 'OWNER', 'REGIONAL_MANAGER'].includes(role) || Boolean((request.user as any)?.hasMultiBranchAccess)
            if (!isElevated && userBranchId && body.storeId && body.storeId !== userBranchId) {
                return reply.code(403).send({ message: 'Forbidden: Cannot create orders for another branch.' })
            }
            if (!isElevated && userBranchId && !body.storeId) {
                body.storeId = userBranchId
            }
            const order = await createOrder(body)
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
                    seatNumber: z.string().optional(),
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
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const query = request.query as any
            const { tenantId } = request.user as any
            const { storeId: effectiveStoreId, isForbidden } = resolveEffectiveStoreId(request.user, query.storeId || query.branchId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Access to other branches is restricted.' })
            }

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
                seatNumber: query.seatNumber,
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
            reply.header('X-Total-Refund', aggregates.totalRefund.toString())
            reply.header('X-Net-Revenue', aggregates.netRevenue.toString())
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
                    seatNumber: z.string().optional(),
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
                        totalRefund: z.number().optional(),
                        netRevenue: z.number().optional(),
                        productUnitsSold: z.number(),
                        productRevenue: z.number(),
                    }),
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const query = request.query as any
            const { tenantId } = request.user as any
            const { storeId: effectiveStoreId, isForbidden } = resolveEffectiveStoreId(request.user, query.storeId || query.branchId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Access to other branches is restricted.' })
            }

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
                seatNumber: query.seatNumber,
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
            const { storeId: effectiveStoreId, isForbidden } = resolveEffectiveStoreId(request.user, storeId || branchId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Access to other branches is restricted.' })
            }
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

    server.patch(
        '/:id/fulfillment-status',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                body: z.object({
                    fulfillmentStatus: z.enum(['NEW', 'PENDING', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED', 'SHIPPED']),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string }
            const { fulfillmentStatus } = request.body as { fulfillmentStatus: any }
            const updatedOrder = await updateOrderFulfillmentStatus(id, fulfillmentStatus)
            if (updatedOrder) {
                app.broadcast('ORDER_UPDATED', updatedOrder)
            }
            return reply.send(updatedOrder)
        }
    )

    server.put(
        '/:id/pay',
        {
            schema: {
                params: z.object({
                    id: z.string(),
                }),
                body: z.object({
                    paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'WALLET', 'SPLIT', 'CREDIT']).optional(),
                    paymentStatus: z.string().optional(),
                    status: z.string().optional(),
                    fulfillmentStatus: z.enum(['NEW', 'PENDING', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED', 'SHIPPED']).optional(),
                }),
            },
        },
        async (request, reply) => {
            const { id } = request.params as { id: string }
            const body = request.body as any
            const updatedOrder = await payOrder(id, body)
            if (updatedOrder) {
                app.broadcast('ORDER_UPDATED', updatedOrder)
                app.broadcast('PAYMENT_SUCCESS', updatedOrder)
            }
            return reply.send(updatedOrder)
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
                    q: z.string().optional(),
                    search: z.string().optional(),
                    seatNumber: z.string().optional(),
                    limit: z.string().optional(),
                }),
                response: {
                    200: z.array(orderResponseSchema),
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { storeId, branchId, cashierId, q, search, seatNumber, limit } = request.query as {
                storeId?: string
                branchId?: string
                cashierId?: string
                q?: string
                search?: string
                seatNumber?: string
                limit?: string
            }
            const { storeId: effectiveStoreId, isForbidden } = resolveEffectiveStoreId(request.user, storeId || branchId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Access to other branches is restricted.' })
            }
            return getDraftOrders(effectiveStoreId, cashierId, {
                q: q || search,
                seatNumber,
                limit: limit !== undefined && limit !== '' ? Number(limit) : undefined
            })
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
        '/drafts/all',
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
            const result = await cancelAllDraftOrders(effectiveStoreId, cashierId)
            app.broadcast('ORDER_UPDATED', { bulkDeleted: true, count: result.count })
            return reply.send(result)
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
            const { storeId: effectiveStoreId, isForbidden } = resolveEffectiveStoreId(request.user, storeId || branchId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Multi-branch analytics access is restricted to elevated roles.' })
            }
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
