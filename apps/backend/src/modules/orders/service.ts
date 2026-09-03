import { prisma } from '../../lib/prisma.js'
import { z } from 'zod'
import { CreateOrderInput, createOrderItemSchema, splitPaymentSchema } from './schemas.js'

export async function createOrder(data: CreateOrderInput) {
    // NOTE: We use sequential operations (not interactive $transaction) because
    // the Supabase Transaction Pooler (PgBouncer) does not support interactive
    // transactions. Each operation is atomic on its own; we handle rollback
    // by catching errors and cleaning up manually if needed.

    // ── 1. Resolve storeId ────────────────────────────────────────────────────
    let finalStoreId = data.storeId
    const storeExists = finalStoreId ? await prisma.store.findUnique({ where: { id: finalStoreId } }) : null
    if (!storeExists) {
        if (data.cashierId) {
            const user = await prisma.user.findUnique({
                where: { id: data.cashierId },
                select: { branchId: true }
            })
            if (user?.branchId) {
                finalStoreId = user.branchId
            }
        }
        const checkStore = finalStoreId ? await prisma.store.findUnique({ where: { id: finalStoreId } }) : null
        if (!checkStore) {
            let tenantId: string | undefined;
            if (data.cashierId) {
                const user = await prisma.user.findUnique({ where: { id: data.cashierId }, select: { tenantId: true } });
                tenantId = user?.tenantId;
            }
            const firstStore = await prisma.store.findFirst({
                where: tenantId ? { tenantId } : undefined
            })
            if (firstStore) {
                finalStoreId = firstStore.id
            } else {
                throw new Error('No store found in database to associate with this order.')
            }
        }
    }

    // ── 2. Create or Update (if completing an existing draft order) ─────────
    let existingDraft = data.draftId ? await prisma.order.findUnique({
        where: { id: data.draftId },
        include: { items: true, splitPayments: true }
    }) : null

    let order: any

    if (existingDraft) {
        // Delete old items & split payments to replace with final cart state
        await prisma.orderItem.deleteMany({ where: { orderId: existingDraft.id } })
        await prisma.splitPayment.deleteMany({ where: { orderId: existingDraft.id } })

        order = await prisma.order.update({
            where: { id: existingDraft.id },
            data: {
                storeId: finalStoreId,
                cashierId: data.cashierId,
                customerId: data.customerId,
                totalAmount: data.totalAmount.toString(),
                paymentMethod: data.paymentMethod,
                paymentStatus: data.paymentStatus || 'PAID',
                status: data.paymentStatus === 'DRAFT' ? 'DRAFT' : 'COMPLETED',
                fulfillmentStatus: (data.fulfillmentStatus as any) || (existingDraft as any).fulfillmentStatus || 'NEW',
                items: {
                    create: data.items.map((item: z.infer<typeof createOrderItemSchema>) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: item.price.toString(),
                        seatNumber: item.seatNumber,
                    })),
                },
                splitPayments: data.splitPayments ? {
                    create: data.splitPayments.map((sp: z.infer<typeof splitPaymentSchema>) => ({
                        method: sp.method,
                        amount: sp.amount.toString(),
                        reference: sp.reference
                    }))
                } : undefined
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                customer: true,
                cashier: true,
                store: true,
                splitPayments: true
            }
        })

        // Adjust stock difference if quantities changed
        const oldItemMap = new Map<string, number>()
        for (const item of existingDraft.items) {
            oldItemMap.set(item.productId, (oldItemMap.get(item.productId) || 0) + item.quantity)
        }
        for (const item of data.items) {
            const oldQty = oldItemMap.get(item.productId) || 0
            const diff = item.quantity - oldQty
            if (diff > 0) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: diff } }
                }).catch(() => {})
            } else if (diff < 0) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: Math.abs(diff) } }
                }).catch(() => {})
            }
            oldItemMap.delete(item.productId)
        }
        for (const [prodId, removedQty] of oldItemMap.entries()) {
            await prisma.product.update({
                where: { id: prodId },
                data: { stock: { increment: removedQty } }
            }).catch(() => {})
        }
    } else {
        order = await prisma.order.create({
            data: {
                storeId: finalStoreId,
                cashierId: data.cashierId,
                customerId: data.customerId,
                totalAmount: data.totalAmount.toString(),
                paymentMethod: data.paymentMethod,
                paymentStatus: data.paymentStatus || 'PENDING',
                status: data.paymentStatus === 'DRAFT' ? 'DRAFT' : 'COMPLETED',
                fulfillmentStatus: (data.fulfillmentStatus as any) || 'NEW',
                items: {
                    create: data.items.map((item: z.infer<typeof createOrderItemSchema>) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: item.price.toString(),
                        seatNumber: item.seatNumber,
                    })),
                },
                splitPayments: data.splitPayments ? {
                    create: data.splitPayments.map((sp: z.infer<typeof splitPaymentSchema>) => ({
                        method: sp.method,
                        amount: sp.amount.toString(),
                        reference: sp.reference
                    }))
                } : undefined
            },
            include: {
                items: true,
                splitPayments: true
            },
        })
    }

    // ── 3. Handle Credit Sales ────────────────────────────────────────────────
    if (data.paymentMethod === 'CREDIT' && data.customerId) {
        await prisma.creditSale.create({
            data: {
                orderId: order.id,
                customerId: data.customerId,
                dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                balance: data.totalAmount.toString(),
            }
        })
    }

    // ── 4. Handle Wallet Payments ─────────────────────────────────────────────
    if (data.paymentMethod === 'WALLET' && data.customerId) {
        await prisma.customer.update({
            where: { id: data.customerId },
            data: {
                walletBalance: { decrement: data.totalAmount.toString() }
            }
        })
    }

    // ── 5. Intelligent Stock Management ───────────────────────────────────────
    for (const item of data.items) {
        const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: { bundleItems: true }
        })

        if (!product) continue

        if (product.type === 'BUNDLED') {
            // Decrement each bundle component's stock in parallel
            await Promise.all(
                product.bundleItems.map((bundleItem) =>
                    prisma.product.update({
                        where: { id: bundleItem.componentProductId },
                        data: {
                            stock: { decrement: bundleItem.quantity * item.quantity }
                        }
                    })
                )
            )
        } else if (item.variantId) {
            // Decrement variant stock
            await prisma.productVariant.update({
                where: { id: item.variantId },
                data: {
                    stock: { decrement: item.quantity }
                }
            })
        } else {
            // Decrement standard product stock
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: { decrement: item.quantity }
                }
            })
        }
    }

    return order
}

export interface GetOrdersFilters {
    q?: string
    search?: string
    paymentStatus?: string
    paymentStatuses?: string[]
    paymentMethod?: string
    paymentMethods?: string[]
    orderStatus?: string
    orderStatuses?: string[]
    status?: string
    fulfillmentStatus?: string   // Progression status (NEW, IN_PREPARATION, READY_FOR_PICKUP, DELIVERED, SHIPPED)
    staffId?: string
    cashierId?: string
    customerId?: string
    startDate?: string
    endDate?: string
    dateFrom?: string
    dateTo?: string
    itemName?: string
    categoryId?: string
    minUnitPrice?: number
    maxUnitPrice?: number
    minItemQty?: number
    maxItemQty?: number
    minTotal?: number
    maxTotal?: number
    productId?: string           // Strict exact relational ID match on OrderItem.productId
    seatNumber?: string          // Optional seat number filter
    branchId?: string
    storeId?: string
    page?: number
    limit?: number
}

export function buildOrderWhereClause(storeId?: string, tenantId?: string, filters?: GetOrdersFilters) {
    const whereClause: any = {
        NOT: {
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
        }
    }

    // 1. Branch & Tenant Scoping (Supports storeId, branchId, filters.storeId, filters.branchId)
    const effectiveStoreId = storeId || filters?.branchId || filters?.storeId
    const isAllBranches = !effectiveStoreId || effectiveStoreId === 'ALL' || effectiveStoreId === 'all' || effectiveStoreId.trim() === ''
    if (!isAllBranches) {
        whereClause.storeId = effectiveStoreId
        if (tenantId) {
            whereClause.store = { tenantId }
        }
    } else if (tenantId) {
        whereClause.store = { tenantId }
    }

    const andConditions: any[] = []

    // 2. Order Lifecycle Status Filter (COMPLETED, REFUNDED, CANCELLED, PARTIALLY_REFUNDED, PENDING)
    const rawStatus = filters?.orderStatus || filters?.status
    const targetStatus = (rawStatus && rawStatus !== 'ALL' ? rawStatus : (filters?.orderStatuses && filters.orderStatuses.length === 1 ? filters.orderStatuses[0] : undefined))?.toUpperCase()
    
    if (filters?.orderStatuses && filters.orderStatuses.length > 1) {
        const statusOrClauses: any[] = []
        for (const s of filters.orderStatuses) {
            const st = s.toUpperCase()
            if (st === 'COMPLETED') {
                statusOrClauses.push(
                    { status: { in: ['COMPLETED', 'completed'] } },
                    { paymentStatus: { in: ['SUCCESS', 'PAID'] }, NOT: { status: { in: ['CANCELLED', 'REFUNDED'] } } }
                )
            } else if (st === 'REFUNDED') {
                statusOrClauses.push(
                    { status: { in: ['REFUNDED', 'refunded'] } },
                    { paymentStatus: { in: ['REFUNDED', 'refunded'] } },
                    { refund: { isNot: null } }
                )
            } else if (st === 'CANCELLED') {
                statusOrClauses.push(
                    { status: { in: ['CANCELLED', 'cancelled'] } },
                    { paymentStatus: { in: ['CANCELLED', 'cancelled'] } }
                )
            } else if (st === 'PARTIALLY_REFUNDED') {
                statusOrClauses.push(
                    { status: { in: ['PARTIALLY_REFUNDED', 'partially_refunded'] } },
                    { paymentStatus: { in: ['PARTIALLY_REFUNDED', 'partially_refunded'] } }
                )
            } else {
                statusOrClauses.push({ status: st })
            }
        }
        andConditions.push({ OR: statusOrClauses })
    } else if (targetStatus) {
        if (targetStatus === 'COMPLETED') {
            andConditions.push({
                OR: [
                    { status: { in: ['COMPLETED', 'completed'] } },
                    {
                        paymentStatus: { in: ['SUCCESS', 'PAID'] },
                        NOT: [
                            { status: { in: ['CANCELLED', 'REFUNDED'] } },
                            { paymentStatus: 'REFUNDED' }
                        ]
                    }
                ]
            })
        } else if (targetStatus === 'REFUNDED') {
            andConditions.push({
                OR: [
                    { status: { in: ['REFUNDED', 'refunded'] } },
                    { paymentStatus: { in: ['REFUNDED', 'refunded'] } },
                    { refund: { isNot: null } }
                ]
            })
        } else if (targetStatus === 'CANCELLED') {
            andConditions.push({
                OR: [
                    { status: { in: ['CANCELLED', 'cancelled'] } },
                    { paymentStatus: { in: ['CANCELLED', 'cancelled'] } }
                ]
            })
        } else if (targetStatus === 'PARTIALLY_REFUNDED') {
            andConditions.push({
                OR: [
                    { status: { in: ['PARTIALLY_REFUNDED', 'partially_refunded'] } },
                    { paymentStatus: { in: ['PARTIALLY_REFUNDED', 'partially_refunded'] } }
                ]
            })
        } else if (targetStatus === 'PENDING') {
            andConditions.push({
                OR: [
                    { status: { in: ['PENDING', 'pending'] } },
                    {
                        paymentStatus: { in: ['PENDING', 'pending'] },
                        NOT: { status: { in: ['CANCELLED', 'REFUNDED'] } }
                    }
                ]
            })
        } else {
            andConditions.push({
                OR: [
                    { status: { equals: targetStatus, mode: 'insensitive' } },
                    { paymentStatus: { equals: targetStatus, mode: 'insensitive' } }
                ]
            })
        }
    }

    // 3. Fulfillment Status Filter (NEW, PENDING, IN_PREPARATION, READY_FOR_PICKUP, DELIVERED, SHIPPED)
    if (filters?.fulfillmentStatus && filters.fulfillmentStatus !== 'ALL') {
        const fulfill = filters.fulfillmentStatus.toUpperCase()
        let mappedFulfill: any = fulfill
        if (fulfill === 'READY_FOR_PICKUP' || fulfill === 'READY') {
            mappedFulfill = 'READY_FOR_PICKUP'
        } else if (fulfill === 'IN_PREPARATION' || fulfill === 'PREPARING') {
            mappedFulfill = 'IN_PREPARATION'
        }

        const validFulfillmentEnums = ['NEW', 'PENDING', 'IN_PREPARATION', 'READY_FOR_PICKUP', 'DELIVERED', 'SHIPPED']
        const isEnum = validFulfillmentEnums.includes(mappedFulfill)

        andConditions.push({
            OR: [
                ...(isEnum ? [{ fulfillmentStatus: mappedFulfill }] : []),
                { status: { in: [fulfill, mappedFulfill, fulfill.toLowerCase()] } }
            ]
        })
    }

    // 4. Payment Status Filters
    if (filters?.paymentStatuses && filters.paymentStatuses.length > 0) {
        whereClause.paymentStatus = { in: filters.paymentStatuses }
    } else if (filters?.paymentStatus && filters.paymentStatus !== 'ALL') {
        whereClause.paymentStatus = filters.paymentStatus
    }

    // 5. Payment Method Filters
    if (filters?.paymentMethods && filters.paymentMethods.length > 0) {
        whereClause.paymentMethod = { in: filters.paymentMethods as any }
    } else if (filters?.paymentMethod && filters.paymentMethod !== 'ALL') {
        whereClause.paymentMethod = filters.paymentMethod as any
    }

    // 6. Personnel & Customer (Supports staffId / cashierId)
    const effectiveCashierId = filters?.staffId || filters?.cashierId
    if (effectiveCashierId) {
        whereClause.cashierId = effectiveCashierId
    }

    if (filters?.customerId) {
        whereClause.customerId = filters.customerId
    }

    // 7. Date/Time ISO Boundaries (Supports startDate / endDate / dateFrom / dateTo)
    const effectiveDateFrom = filters?.startDate || filters?.dateFrom
    const effectiveDateTo = filters?.endDate || filters?.dateTo
    if (effectiveDateFrom || effectiveDateTo) {
        whereClause.createdAt = {
            ...(effectiveDateFrom ? { gte: new Date(effectiveDateFrom) } : {}),
            ...(effectiveDateTo ? { lte: new Date(effectiveDateTo) } : {})
        }
    }

    // 8. Itemized Bill & Product Attribute Filters
    const itemConditions: any = {}
    if (filters?.itemName && filters.itemName.trim()) {
        itemConditions.product = {
            ...itemConditions.product,
            name: { contains: filters.itemName.trim(), mode: 'insensitive' }
        }
    }
    if (filters?.categoryId && filters.categoryId.trim()) {
        itemConditions.product = {
            ...itemConditions.product,
            categoryId: filters.categoryId.trim()
        }
    }
    if (filters?.minItemQty !== undefined) {
        itemConditions.quantity = { ...itemConditions.quantity, gte: Number(filters.minItemQty) }
    }
    if (filters?.maxItemQty !== undefined) {
        itemConditions.quantity = { ...itemConditions.quantity, lte: Number(filters.maxItemQty) }
    }
    if (filters?.minUnitPrice !== undefined) {
        itemConditions.price = { ...itemConditions.price, gte: filters.minUnitPrice }
    }
    if (filters?.maxUnitPrice !== undefined) {
        itemConditions.price = { ...itemConditions.price, lte: filters.maxUnitPrice }
    }
    // Strict exact-match product filter
    if (filters?.productId && filters.productId.trim()) {
        itemConditions.productId = filters.productId.trim()
    }
    // Optional seat number filter
    if (filters?.seatNumber && filters.seatNumber.trim()) {
        itemConditions.seatNumber = { contains: filters.seatNumber.trim(), mode: 'insensitive' }
    }
    if (Object.keys(itemConditions).length > 0) {
        whereClause.items = { some: itemConditions }
    }

    // 9. Financial Bounds
    if (filters?.minTotal !== undefined || filters?.maxTotal !== undefined) {
        whereClause.totalAmount = {
            ...(filters.minTotal !== undefined ? { gte: filters.minTotal } : {}),
            ...(filters.maxTotal !== undefined ? { lte: filters.maxTotal } : {})
        }
    }

    // 10. Multi-vector search (Supports q / search)
    const effectiveQuery = (filters?.q || filters?.search)?.trim()
    if (effectiveQuery) {
        andConditions.push({
            OR: [
                { id: { contains: effectiveQuery, mode: 'insensitive' } },
                { customer: { name: { contains: effectiveQuery, mode: 'insensitive' } } },
                { customer: { phone: { contains: effectiveQuery, mode: 'insensitive' } } },
                { customer: { email: { contains: effectiveQuery, mode: 'insensitive' } } },
                { customer: { id: { contains: effectiveQuery, mode: 'insensitive' } } },
                { cashier: { name: { contains: effectiveQuery, mode: 'insensitive' } } },
                { cashier: { email: { contains: effectiveQuery, mode: 'insensitive' } } },
                { cashier: { staffCode: { contains: effectiveQuery, mode: 'insensitive' } } },
                { cashier: { id: { contains: effectiveQuery, mode: 'insensitive' } } },
                { store: { name: { contains: effectiveQuery, mode: 'insensitive' } } },
                { store: { branchCode: { contains: effectiveQuery, mode: 'insensitive' } } },
                { posDeviceType: { contains: effectiveQuery, mode: 'insensitive' } },
                { items: { some: { product: { name: { contains: effectiveQuery, mode: 'insensitive' } } } } },
                { items: { some: { product: { sku: { contains: effectiveQuery, mode: 'insensitive' } } } } },
                { items: { some: { seatNumber: { contains: effectiveQuery, mode: 'insensitive' } } } }
            ]
        })
    }

    if (andConditions.length > 0) {
        whereClause.AND = andConditions
    }

    return whereClause
}

/**
 * Automated 1-hour Idle/Pending Fulfillment Logic:
 * If fulfillmentStatus == 'NEW' for >60 minutes without manual staff updates,
 * automatically transition the fulfillmentStatus to 'PENDING'.
 */
export async function checkAndTransitionIdleOrders(storeId?: string, tenantId?: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    try {
        const isAllBranches = !storeId || storeId === 'ALL' || storeId === 'all' || storeId.trim() === ''
        await prisma.order.updateMany({
            where: {
                fulfillmentStatus: 'NEW',
                createdAt: { lte: oneHourAgo },
                NOT: {
                    paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
                },
                ...(!isAllBranches ? { storeId } : {}),
                ...(tenantId ? { store: { tenantId } } : {})
            },
            data: {
                fulfillmentStatus: 'PENDING'
            }
        })
    } catch (err) {
        console.error('[FULFILLMENT] Failed to transition idle orders to PENDING:', err)
    }
}

export async function getOrders(storeId?: string, tenantId?: string, filters?: GetOrdersFilters) {
    await checkAndTransitionIdleOrders(storeId, tenantId)
    const whereClause = buildOrderWhereClause(storeId, tenantId, filters)

    const take = filters?.limit && filters.limit > 0 ? filters.limit : undefined
    const skip = filters?.page && filters.page > 0 && take ? (filters.page - 1) * take : undefined

    return prisma.order.findMany({
        where: whereClause,
        take,
        skip,
        include: {
            store: true,
            items: {
                include: {
                    product: {
                        include: {
                            category: true
                        }
                    }
                }
            },
            customer: true,
            cashier: true,
            splitPayments: true,
            terminalTransaction: true,
            refund: true,
            creditSale: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
}

export async function getOrderAggregates(storeId?: string, tenantId?: string, filters?: GetOrdersFilters) {
    await checkAndTransitionIdleOrders(storeId, tenantId)
    const whereClause = buildOrderWhereClause(storeId, tenantId, filters)

    const [totalCount, totalRevenueResult, refundAggregate, refundedOrdersAggregate] = await Promise.all([
        prisma.order.count({ where: whereClause }),
        prisma.order.aggregate({
            where: whereClause,
            _sum: {
                totalAmount: true
            }
        }),
        prisma.refund.aggregate({
            where: {
                order: whereClause
            },
            _sum: {
                amount: true
            }
        }).catch(() => ({ _sum: { amount: null } })),
        prisma.order.aggregate({
            where: {
                ...whereClause,
                OR: [{ status: 'REFUNDED' }, { paymentStatus: 'REFUNDED' }]
            },
            _sum: {
                totalAmount: true
            }
        }).catch(() => ({ _sum: { totalAmount: null } }))
    ])

    const totalRevenue = Number(totalRevenueResult._sum.totalAmount || 0)
    const refundFromTable = Number(refundAggregate._sum?.amount || 0)
    const refundFromOrders = Number(refundedOrdersAggregate._sum?.totalAmount || 0)
    const totalRefund = Math.max(refundFromTable, refundFromOrders)
    const netRevenue = Math.max(0, totalRevenue - totalRefund)

    let productUnitsSold = 0
    let productRevenue = 0

    if (filters?.productId && filters.productId.trim()) {
        const itemAggregates = await prisma.orderItem.findMany({
            where: {
                productId: filters.productId.trim(),
                order: whereClause
            },
            select: {
                quantity: true,
                price: true
            }
        })

        for (const item of itemAggregates) {
            productUnitsSold += item.quantity
            productRevenue += Number(item.price) * item.quantity
        }
    }

    return {
        totalCount,
        totalRevenue,
        totalRefund,
        netRevenue,
        productUnitsSold,
        productRevenue
    }
}

export async function getOrderById(id: string) {
    return prisma.order.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    product: true
                }
            },
            customer: true,
            cashier: true,
            splitPayments: true,
            terminalTransaction: true
        }
    })
}

export async function updateOrderStatus(id: string, status: string) {
    await prisma.order.update({
        where: { id },
        data: { status },
    })
    return getOrderById(id)
}

export async function updateOrderPaymentStatus(id: string, paymentStatus: string) {
    await prisma.order.update({
        where: { id },
        data: { 
            paymentStatus,
            status: paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' ? 'COMPLETED' : undefined
        },
    })
    return getOrderById(id)
}

export async function updateOrderFulfillmentStatus(id: string, fulfillmentStatus: any) {
    await prisma.order.update({
        where: { id },
        data: { fulfillmentStatus },
    })
    return getOrderById(id)
}

export async function payOrder(id: string, data: { paymentMethod?: any; paymentStatus?: string; status?: string; fulfillmentStatus?: any; splitPayments?: any[] }) {
    if (data.splitPayments && data.splitPayments.length > 0) {
        await prisma.splitPayment.deleteMany({ where: { orderId: id } })
        await prisma.splitPayment.createMany({
            data: data.splitPayments.map(sp => ({
                orderId: id,
                method: sp.method,
                amount: sp.amount.toString(),
                reference: sp.reference
            }))
        })
    }

    await prisma.order.update({
        where: { id },
        data: {
            paymentStatus: data.paymentStatus || 'PAID',
            status: data.status || 'COMPLETED',
            ...(data.fulfillmentStatus ? { fulfillmentStatus: data.fulfillmentStatus } : {}),
            paymentMethod: data.paymentMethod || undefined
        }
    })

    return getOrderById(id)
}


export async function getDraftOrders(storeId?: string, cashierId?: string, filters?: { q?: string; search?: string; seatNumber?: string; limit?: number }) {
    const isAllBranches = !storeId || storeId === 'ALL' || storeId === 'all' || storeId.trim() === ''
    const isAllCashiers = !cashierId || cashierId === 'ALL' || cashierId === 'all' || cashierId.trim() === ''

    const andConditions: any[] = []
    const query = (filters?.q || filters?.search)?.trim()
    if (query) {
        andConditions.push({
            OR: [
                { id: { contains: query, mode: 'insensitive' } },
                { customer: { name: { contains: query, mode: 'insensitive' } } },
                { customer: { phone: { contains: query, mode: 'insensitive' } } },
                { cashier: { name: { contains: query, mode: 'insensitive' } } },
                { cashier: { staffCode: { contains: query, mode: 'insensitive' } } },
                { items: { some: { product: { name: { contains: query, mode: 'insensitive' } } } } },
                { items: { some: { product: { sku: { contains: query, mode: 'insensitive' } } } } },
                { items: { some: { seatNumber: { contains: query, mode: 'insensitive' } } } }
            ]
        })
    }
    if (filters?.seatNumber && filters.seatNumber.trim()) {
        andConditions.push({
            items: { some: { seatNumber: { contains: filters.seatNumber.trim(), mode: 'insensitive' } } }
        })
    }

    return prisma.order.findMany({
        where: {
            ...(!isAllBranches ? { storeId } : {}),
            ...(!isAllCashiers ? { cashierId } : {}),
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] },
            ...(andConditions.length > 0 ? { AND: andConditions } : {})
        },
        take: filters?.limit && filters.limit > 0 ? filters.limit : undefined,
        include: {
            items: {
                include: {
                    product: true
                }
            },
            customer: true,
            cashier: true,
            splitPayments: true,
            terminalTransaction: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    })
}

export async function lockDraftOrder(id: string) {
    await prisma.order.update({
        where: { id },
        data: { paymentStatus: 'IN_CHECKOUT' },
    })
    return getOrderById(id)
}

export async function cancelDraftOrder(id: string) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
    })

    if (!order) {
        throw new Error('Draft order not found')
    }

    // Restore product stock upon canceling draft
    if (order.items && order.items.length > 0) {
        for (const item of order.items) {
            if (item.productId) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                }).catch(() => {})
            }
        }
    }

    // Delete dependent records first to prevent foreign key errors
    await prisma.orderItem.deleteMany({ where: { orderId: id } })
    await prisma.splitPayment.deleteMany({ where: { orderId: id } })
    await prisma.terminalTransaction.deleteMany({ where: { orderId: id } }).catch(() => {})

    return prisma.order.delete({
        where: { id }
    })
}

export async function cancelAllDraftOrders(storeId?: string, cashierId?: string) {
    const isAllBranches = !storeId || storeId === 'ALL' || storeId === 'all' || storeId.trim() === ''
    const isAllCashiers = !cashierId || cashierId === 'ALL' || cashierId === 'all' || cashierId.trim() === ''

    const drafts = await prisma.order.findMany({
        where: {
            ...(!isAllBranches ? { storeId } : {}),
            ...(!isAllCashiers ? { cashierId } : {}),
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
        },
        include: { items: true }
    })

    if (drafts.length === 0) {
        return { success: true, count: 0 }
    }

    const orderIds = drafts.map(d => d.id)

    // 1. Restore product stock in aggregate
    const stockRestorations = new Map<string, number>()
    for (const draft of drafts) {
        if (draft.items && draft.items.length > 0) {
            for (const item of draft.items) {
                if (item.productId) {
                    stockRestorations.set(
                        item.productId,
                        (stockRestorations.get(item.productId) || 0) + item.quantity
                    )
                }
            }
        }
    }

    for (const [productId, qty] of stockRestorations.entries()) {
        await prisma.product.update({
            where: { id: productId },
            data: { stock: { increment: qty } }
        }).catch(() => {})
    }

    // 2. Delete relational items
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } })
    await prisma.splitPayment.deleteMany({ where: { orderId: { in: orderIds } } })
    await prisma.terminalTransaction.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})

    // 3. Delete orders
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } })

    return { success: true, count: orderIds.length }
}

export async function sendDigitalReceiptEmail(
    orderId: string,
    recipientEmail: string,
    saveToCrm?: boolean,
    customerId?: string
) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            items: { include: { product: true } },
            customer: true,
            cashier: true,
            store: { select: { name: true, tenant: { select: { name: true } } } }
        }
    })

    if (!order) throw new Error('Order not found')

    // Update customer CRM email if requested
    if (saveToCrm && (customerId || order.customerId)) {
        const targetCustId = customerId || order.customerId
        if (targetCustId) {
            await prisma.customer.update({
                where: { id: targetCustId },
                data: { email: recipientEmail }
            }).catch((err) => console.error('[CRM] Failed to update customer email:', err))
        }
    }

    const businessName = order.store?.tenant?.name || order.store?.name || 'DeMegaPOS'
    const invoiceNumber = order.id.slice(-8).toUpperCase()
    const formattedDate = new Date(order.createdAt).toLocaleString()

    const itemsHtml = order.items.map(item => `
        <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #F3F4F6;">${item.product?.name || 'Item'}</td>
            <td style="padding: 8px 0; text-align: center; border-bottom: 1px solid #F3F4F6;">${item.quantity}</td>
            <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #F3F4F6;">₦${Number(item.price).toLocaleString()}</td>
            <td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #F3F4F6;">₦${(Number(item.price) * item.quantity).toLocaleString()}</td>
        </tr>
    `).join('')

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F9FAFB; padding: 30px; margin: 0; }
    .card { background: #FFFFFF; max-width: 520px; margin: 0 auto; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    .header { text-align: center; border-bottom: 2px dashed #E5E7EB; padding-bottom: 20px; margin-bottom: 20px; }
    .title { font-size: 22px; font-weight: 900; color: #111827; text-transform: uppercase; margin: 0; }
    .subtitle { font-size: 11px; font-weight: 700; color: #6B7280; letter-spacing: 1px; margin-top: 4px; }
    .meta { font-family: monospace; font-size: 12px; color: #4B5563; line-height: 1.6; margin-bottom: 20px; text-align: left; }
    table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 12px; margin-bottom: 20px; }
    th { text-align: left; font-weight: 900; color: #111827; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB; }
    .total-row { font-family: monospace; font-size: 16px; font-weight: 900; color: #111827; display: flex; justify-content: space-between; border-top: 2px dashed #E5E7EB; padding-top: 16px; margin-top: 16px; }
    .footer { text-align: center; font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">${businessName}</div>
      <div class="subtitle">Official POS Digital Invoice</div>
    </div>
    <div class="meta">
      <div>INVOICE: #${invoiceNumber}</div>
      <div>DATE: ${formattedDate}</div>
      <div>PAYMENT METHOD: ${order.paymentMethod}</div>
      ${order.customer?.name ? `<div>CUSTOMER: ${order.customer.name}</div>` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th>ITEM</th>
          <th style="text-align:center">QTY</th>
          <th style="text-align:right">PRICE</th>
          <th style="text-align:right">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    <div class="total-row">
      <span>TOTAL PAID</span>
      <span>₦${Number(order.totalAmount).toLocaleString()}</span>
    </div>
    <div class="footer">
      Thank you for shopping with ${businessName}!
    </div>
  </div>
</body>
</html>
    `

    const { sendMail } = await import('../../lib/mail.js')
    await sendMail({
        to: recipientEmail,
        subject: `Digital Receipt #${invoiceNumber} - ${businessName}`,
        html
    })

    return { success: true, message: `Digital receipt successfully sent to ${recipientEmail}` }
}

/**
 * Wipe/reset all financial records (non-draft orders) for a store.
 * This is a destructive admin-only operation — use with caution.
 * It deletes: TerminalTransaction records, SplitPayment records, OrderItem records,
 * and then the Orders themselves for the given storeId / tenant.
 */
export async function resetFinancialRecords(storeId?: string) {
    const orderWhere = {
        ...(storeId ? { storeId } : {}),
        NOT: {
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
        }
    }

    // Fetch order IDs to delete related data
    const orders = await prisma.order.findMany({
        where: orderWhere,
        select: { id: true }
    })
    const orderIds = orders.map(o => o.id)

    if (orderIds.length === 0) {
        return { deleted: 0, message: 'No records to reset.' }
    }

    // Delete dependent records first (FK constraints)
    await prisma.terminalTransaction.deleteMany({
        where: { orderId: { in: orderIds } }
    })

    await prisma.splitPayment.deleteMany({
        where: { orderId: { in: orderIds } }
    })

    await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } }
    })

    // Finally delete the orders
    const { count } = await prisma.order.deleteMany({
        where: orderWhere
    })

    return { deleted: count, message: `Successfully reset ${count} financial record(s).` }
}

export async function refundOrder(orderId: string, authorizedBy: string, reason: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { product: true } } }
    })

    if (!order) throw new Error('Order not found')
    if (order.paymentStatus !== 'SUCCESS' && order.paymentStatus !== 'PAID') {
        throw new Error('Only completed (paid) orders can be refunded.')
    }

    // Reverse stock for each item
    for (const item of order.items) {
        if (item.variantId) {
            await prisma.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } }
            }).catch(() => {})
        } else if (item.productId) {
            await prisma.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } }
            }).catch(() => {})
        }
    }

    // Mark order as REFUNDED
    await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' }
    })

    // Log the refund activity & record in Refund database table
    const storeRecord = await prisma.store.findUnique({ where: { id: order.storeId }, select: { tenantId: true } })
    if (storeRecord) {
        await prisma.refund.create({
            data: {
                orderId: order.id,
                amount: order.totalAmount,
                reason,
                processedBy: authorizedBy,
            }
        }).catch((err) => console.error('[REFUND] Failed to create Refund record:', err))

        await prisma.activityLog.create({
            data: {
                action: 'REFUND_ISSUED',
                entity: 'Order',
                entityId: orderId,
                details: { reason, authorizedBy, amount: order.totalAmount.toString() },
                userId: authorizedBy,
                tenantId: storeRecord.tenantId,
            }
        }).catch(() => {})
    }

    return { success: true, orderId, amount: order.totalAmount.toString() }
}

export async function getAnalyticsData(storeId?: string, tenantId?: string, startDate?: Date, endDate?: Date) {
    const now = endDate || new Date()
    const start = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const isAllBranches = !storeId || storeId === 'ALL' || storeId === 'all' || storeId.trim() === ''

    const whereClause: any = {
        paymentStatus: { in: ['SUCCESS', 'PAID'] },
        createdAt: { gte: start, lte: now }
    }
    if (!isAllBranches) {
        whereClause.storeId = storeId
        if (tenantId) whereClause.store = { tenantId }
    } else if (tenantId) {
        whereClause.store = { tenantId }
    }

    const orders = await prisma.order.findMany({
        where: whereClause,
        include: {
            items: { include: { product: { select: { name: true, costPrice: true } } } },
            cashier: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
    })

    // Fetch refund records for net calculation
    const refundWhere: any = { createdAt: { gte: start, lte: now } }
    if (!isAllBranches) {
        refundWhere.order = { storeId }
        if (tenantId) refundWhere.order.store = { tenantId }
    } else if (tenantId) {
        refundWhere.order = { store: { tenantId } }
    }
    const refunds = await prisma.refund.findMany({
        where: refundWhere,
        include: { order: true }
    }).catch(() => [])

    const grossRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const totalRefundedAmount = refunds.reduce((sum, r) => sum + Number(r.amount), 0)
    const netRevenue = Math.max(0, grossRevenue - totalRefundedAmount)

    const totalCost = orders.reduce((sum, o) =>
        sum + o.items.reduce((s, i) =>
            s + (Number(i.product?.costPrice || 0) * i.quantity), 0), 0)
    const netProfit = netRevenue - totalCost
    const aov = orders.length > 0 ? netRevenue / orders.length : 0

    const totalOrdersCount = orders.length
    const totalRefundVolume = refunds.length
    const refundRate = (totalOrdersCount + totalRefundVolume) > 0 ? (totalRefundVolume / (totalOrdersCount + totalRefundVolume)) * 100 : 0

    // Refund reasons breakdown
    const reasonMap: Record<string, number> = {}
    for (const r of refunds) {
        const reason = r.reason || 'General Return / Customer Choice'
        reasonMap[reason] = (reasonMap[reason] || 0) + 1
    }
    const refundReasonsBreakdown = Object.entries(reasonMap).map(([reason, count]) => ({ reason, count }))

    // Daily revenue timeline
    const dailyMap: Record<string, number> = {}
    for (const order of orders) {
        const day = order.createdAt.toISOString().split('T')[0]
        dailyMap[day] = (dailyMap[day] || 0) + Number(order.totalAmount)
    }
    // Deduct refunds per day
    for (const r of refunds) {
        const day = r.createdAt.toISOString().split('T')[0]
        if (dailyMap[day]) {
            dailyMap[day] = Math.max(0, dailyMap[day] - Number(r.amount))
        }
    }
    const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }))

    // Payment method distribution
    const methodMap: Record<string, number> = {}
    for (const order of orders) {
        const method = order.paymentMethod
        methodMap[method] = (methodMap[method] || 0) + 1
    }
    const paymentMethods = Object.entries(methodMap).map(([method, count]) => ({ method, count }))

    // Peak hours heatmap (0–23)
    const hourMap: Record<number, number> = {}
    for (const order of orders) {
        const hour = new Date(order.createdAt).getHours()
        hourMap[hour] = (hourMap[hour] || 0) + 1
    }
    const peakHours = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: hourMap[h] || 0 }))

    // Top 10 products by revenue
    const productMap: Record<string, { name: string; revenue: number; qty: number }> = {}
    for (const order of orders) {
        for (const item of order.items) {
            const key = item.productId
            if (!productMap[key]) productMap[key] = { name: item.product?.name || 'Unknown', revenue: 0, qty: 0 }
            productMap[key].revenue += Number(item.price) * item.quantity
            productMap[key].qty += item.quantity
        }
    }
    const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    // Staff leaderboard
    const cashierMap: Record<string, { name: string; sales: number; revenue: number }> = {}
    for (const order of orders) {
        if (!order.cashierId || !order.cashier) continue
        const key = order.cashierId
        if (!cashierMap[key]) cashierMap[key] = { name: order.cashier.name || 'Unknown', sales: 0, revenue: 0 }
        cashierMap[key].sales++
        cashierMap[key].revenue += Number(order.totalAmount)
    }
    const staffLeaderboard = Object.values(cashierMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

    return {
        summary: {
            grossRevenue,
            totalRefundedAmount,
            netRevenue,
            totalRevenue: netRevenue,
            netProfit,
            aov,
            totalOrders: totalOrdersCount,
            refundRate: Number(refundRate.toFixed(1)),
            totalRefundVolume
        },
        refundsSummary: {
            totalRefundedAmount,
            totalRefundVolume,
            refundRate: Number(refundRate.toFixed(1)),
            reasonsBreakdown: refundReasonsBreakdown
        },
        dailyRevenue,
        paymentMethods,
        peakHours,
        topProducts,
        staffLeaderboard,
    }
}

export async function getDashboardSummary(storeId?: string, tenantId?: string, cashierId?: string) {
    const now = new Date()
    
    // Start of Today (local server date)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    
    // Start of Current Month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)

    const isAllBranches = !storeId || storeId === 'ALL' || storeId === 'all' || storeId.trim() === ''
    const isAllCashiers = !cashierId || cashierId === 'ALL' || cashierId === 'all' || cashierId.trim() === ''

    // Base query conditions for completed sales
    const baseWhere: any = {
        paymentStatus: { in: ['SUCCESS', 'PAID'] }
    }
    if (!isAllBranches) {
        baseWhere.storeId = storeId
        if (tenantId) baseWhere.store = { tenantId }
    } else if (tenantId) {
        baseWhere.store = { tenantId }
    }
    if (!isAllCashiers) {
        baseWhere.cashierId = cashierId
    }

    // 1. Fetch completed orders (All-Time, This Month, Today)
    const allCompletedOrders = await prisma.order.findMany({
        where: baseWhere,
        select: {
            id: true,
            totalAmount: true,
            createdAt: true,
            cashierId: true
        }
    })

    // 2. Base query conditions for refunds
    const refundWhere: any = {}
    if (!isAllBranches) {
        refundWhere.order = { storeId }
        if (tenantId) refundWhere.order.store = { tenantId }
    } else if (tenantId) {
        refundWhere.order = { store: { tenantId } }
    }

    const allRefunds = await prisma.refund.findMany({
        where: refundWhere,
        select: {
            id: true,
            amount: true,
            createdAt: true,
            orderId: true
        }
    }).catch(() => [])

    // 3. Compute Gross & Net metrics
    // Today
    const todayOrders = allCompletedOrders.filter(o => o.createdAt >= startOfToday)
    const todayRefunds = allRefunds.filter(r => r.createdAt >= startOfToday)
    const todayGrossSales = todayOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const todayRefundedAmount = todayRefunds.reduce((sum, r) => sum + Number(r.amount), 0)
    const todayNetSales = Math.max(0, todayGrossSales - todayRefundedAmount)

    // Monthly
    const monthlyOrders = allCompletedOrders.filter(o => o.createdAt >= startOfMonth)
    const monthlyRefunds = allRefunds.filter(r => r.createdAt >= startOfMonth)
    const monthlyGrossSales = monthlyOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const monthlyRefundedAmount = monthlyRefunds.reduce((sum, r) => sum + Number(r.amount), 0)
    const monthlyNetSales = Math.max(0, monthlyGrossSales - monthlyRefundedAmount)

    // All Time
    const allTimeGrossSales = allCompletedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
    const allTimeRefundedAmount = allRefunds.reduce((sum, r) => sum + Number(r.amount), 0)
    const allTimeNetSales = Math.max(0, allTimeGrossSales - allTimeRefundedAmount)

    // Active (completed + open) non-draft orders count for this branch
    const activeOrdersWhere: any = {
        NOT: {
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT', 'REFUNDED'] }
        }
    }
    if (!isAllBranches) {
        activeOrdersWhere.storeId = storeId
        if (tenantId) activeOrdersWhere.store = { tenantId }
    } else if (tenantId) {
        activeOrdersWhere.store = { tenantId }
    }
    if (!isAllCashiers) {
        activeOrdersWhere.cashierId = cashierId
    }
    const activeOrdersCount = await prisma.order.count({ where: activeOrdersWhere })

    const totalOrdersCount = allCompletedOrders.length
    const totalRefundCount = allRefunds.length
    const refundRate = (totalOrdersCount + totalRefundCount) > 0
        ? (totalRefundCount / (totalOrdersCount + totalRefundCount)) * 100
        : 0

    return {
        today: {
            grossSales: todayGrossSales,
            refundedAmount: todayRefundedAmount,
            netSales: todayNetSales,
            orderCount: todayOrders.length,
            refundCount: todayRefunds.length
        },
        monthly: {
            grossSales: monthlyGrossSales,
            refundedAmount: monthlyRefundedAmount,
            netSales: monthlyNetSales,
            orderCount: monthlyOrders.length,
            refundCount: monthlyRefunds.length
        },
        allTime: {
            grossSales: allTimeGrossSales,
            refundedAmount: allTimeRefundedAmount,
            netSales: allTimeNetSales,
            orderCount: allCompletedOrders.length,
            refundCount: allRefunds.length
        },
        activeOrdersCount,
        refundSummary: {
            totalRefundedAmount: allTimeRefundedAmount,
            totalRefundCount: totalRefundCount,
            refundRate: Number(refundRate.toFixed(1))
        }
    }
}

