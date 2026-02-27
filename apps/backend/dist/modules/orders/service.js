import { prisma } from '../../lib/prisma.js';
export async function createOrder(data) {
    return prisma.$transaction(async (tx) => {
        // 1. Create the order
        const order = await tx.order.create({
            data: {
                storeId: data.storeId,
                customerId: data.customerId,
                totalAmount: data.totalAmount.toString(),
                paymentMethod: data.paymentMethod,
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
        });
        // 2. Handle Credit Sales
        if (data.paymentMethod === 'CREDIT' && data.customerId) {
            await tx.creditSale.create({
                data: {
                    orderId: order.id,
                    customerId: data.customerId,
                    dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                    balance: data.totalAmount.toString(),
                }
            });
        }
        // 3. Handle Wallet Payments
        if (data.paymentMethod === 'WALLET' && data.customerId) {
            await tx.customer.update({
                where: { id: data.customerId },
                data: {
                    walletBalance: { decrement: data.totalAmount.toString() }
                }
            });
        }
        // 4. Intelligent Stock Management
        for (const item of data.items) {
            const product = await tx.product.findUnique({
                where: { id: item.productId },
                include: { bundleItems: true }
            });
            if (!product)
                continue;
            if (product.type === 'BUNDLED') {
                // Decrement each component's stock
                for (const bundleItem of product.bundleItems) {
                    await tx.product.update({
                        where: { id: bundleItem.componentProductId },
                        data: {
                            stock: { decrement: bundleItem.quantity * item.quantity }
                        }
                    });
                }
            }
            else if (item.variantId) {
                // Decrement variant stock
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });
            }
            else {
                // Decrement standard product stock
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity }
                    }
                });
            }
        }
        return order;
    });
}
export async function getOrders(storeId) {
    return prisma.order.findMany({
        where: { storeId },
        include: {
            items: {
                include: {
                    order: true,
                },
            },
        },
    });
}
export async function updateOrderStatus(id, status) {
    return prisma.order.update({
        where: { id },
        data: { status },
    });
}
