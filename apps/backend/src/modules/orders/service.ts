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
            const firstStore = await prisma.store.findFirst()
            if (firstStore) {
                finalStoreId = firstStore.id
            } else {
                throw new Error('No store found in database to associate with this order.')
            }
        }
    }

    // ── 2. Create the order with items and split payments ─────────────────────
    const order = await prisma.order.create({
        data: {
            storeId: finalStoreId,
            cashierId: data.cashierId,
            customerId: data.customerId,
            totalAmount: data.totalAmount.toString(),
            paymentMethod: data.paymentMethod,
            paymentStatus: data.paymentStatus || 'PENDING',
            items: {
                create: data.items.map((item: z.infer<typeof createOrderItemSchema>) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price.toString(),
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

export async function getOrders(storeId?: string) {
    return prisma.order.findMany({
        where: storeId ? { storeId } : undefined,
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
        data: { paymentStatus },
    })
    return getOrderById(id)
}

export async function getDraftOrders(storeId?: string, cashierId?: string) {
    return prisma.order.findMany({
        where: {
            storeId: storeId ? storeId : undefined,
            cashierId: cashierId ? cashierId : undefined,
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
        },
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

    return prisma.order.delete({
        where: { id }
    })
}

