import { prisma } from '../../lib/prisma.js'
import { CreateOrderInput } from './schemas.js'

export async function createOrder(data: CreateOrderInput) {
    return prisma.$transaction(async (tx) => {
        // Fallback for storeId if the provided store doesn't exist
        let finalStoreId = data.storeId
        const storeExists = finalStoreId ? await tx.store.findUnique({ where: { id: finalStoreId } }) : null
        if (!storeExists) {
            if (data.cashierId) {
                const user = await tx.user.findUnique({
                    where: { id: data.cashierId },
                    select: { branchId: true }
                })
                if (user?.branchId) {
                    finalStoreId = user.branchId
                }
            }
            const checkStore = finalStoreId ? await tx.store.findUnique({ where: { id: finalStoreId } }) : null
            if (!checkStore) {
                const firstStore = await tx.store.findFirst()
                if (firstStore) {
                    finalStoreId = firstStore.id
                } else {
                    throw new Error("No store found in database to associate with this order.")
                }
            }
        }

        // 1. Create the order
        const order = await tx.order.create({
            data: {
                storeId: finalStoreId,
                cashierId: data.cashierId,
                customerId: data.customerId,
                totalAmount: data.totalAmount.toString(),
                paymentMethod: data.paymentMethod,
                paymentStatus: data.paymentStatus || 'PENDING',
                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity,
                        price: item.price.toString(),
                    })),
                },
                // Handle Split Payments
                splitPayments: data.splitPayments ? {
                    create: data.splitPayments.map(sp => ({
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

        // 2. Handle Credit Sales
        if (data.paymentMethod === 'CREDIT' && data.customerId) {
            await tx.creditSale.create({
                data: {
                    orderId: order.id,
                    customerId: data.customerId,
                    dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                    balance: data.totalAmount.toString(),
                }
            })
        }

        // 3. Handle Wallet Payments
        if (data.paymentMethod === 'WALLET' && data.customerId) {
            await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    walletBalance: { decrement: data.totalAmount.toString() }
                }
            })
        }

        // 4. Intelligent Stock Management
        for (const item of data.items) {
            const product = await tx.product.findUnique({
                where: { id: item.productId },
                include: { bundleItems: true }
            })

            if (!product) continue

            if (product.type === 'BUNDLED') {
                // Decrement each component's stock
                for (const bundleItem of product.bundleItems) {
                    await tx.product.update({
                        where: { id: bundleItem.componentProductId },
                        data: {
                            stock: { decrement: bundleItem.quantity * item.quantity }
                        }
                    })
                }
            } else if (item.variantId) {
                // Decrement variant stock
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                })
            } else {
                // Decrement standard product stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                })
            }
        }

        return order
    })
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
            splitPayments: true
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
            splitPayments: true
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
