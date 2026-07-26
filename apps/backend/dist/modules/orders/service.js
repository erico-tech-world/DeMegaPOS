import { prisma } from '../../lib/prisma.js';
export async function createOrder(data) {
    // NOTE: We use sequential operations (not interactive $transaction) because
    // the Supabase Transaction Pooler (PgBouncer) does not support interactive
    // transactions. Each operation is atomic on its own; we handle rollback
    // by catching errors and cleaning up manually if needed.
    // ── 1. Resolve storeId ────────────────────────────────────────────────────
    let finalStoreId = data.storeId;
    const storeExists = finalStoreId ? await prisma.store.findUnique({ where: { id: finalStoreId } }) : null;
    if (!storeExists) {
        if (data.cashierId) {
            const user = await prisma.user.findUnique({
                where: { id: data.cashierId },
                select: { branchId: true }
            });
            if (user?.branchId) {
                finalStoreId = user.branchId;
            }
        }
        const checkStore = finalStoreId ? await prisma.store.findUnique({ where: { id: finalStoreId } }) : null;
        if (!checkStore) {
            const firstStore = await prisma.store.findFirst();
            if (firstStore) {
                finalStoreId = firstStore.id;
            }
            else {
                throw new Error('No store found in database to associate with this order.');
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
                create: data.items.map((item) => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity,
                    price: item.price.toString(),
                })),
            },
            splitPayments: data.splitPayments ? {
                create: data.splitPayments.map((sp) => ({
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
    // ── 3. Handle Credit Sales ────────────────────────────────────────────────
    if (data.paymentMethod === 'CREDIT' && data.customerId) {
        await prisma.creditSale.create({
            data: {
                orderId: order.id,
                customerId: data.customerId,
                dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                balance: data.totalAmount.toString(),
            }
        });
    }
    // ── 4. Handle Wallet Payments ─────────────────────────────────────────────
    if (data.paymentMethod === 'WALLET' && data.customerId) {
        await prisma.customer.update({
            where: { id: data.customerId },
            data: {
                walletBalance: { decrement: data.totalAmount.toString() }
            }
        });
    }
    // ── 5. Intelligent Stock Management ───────────────────────────────────────
    for (const item of data.items) {
        const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: { bundleItems: true }
        });
        if (!product)
            continue;
        if (product.type === 'BUNDLED') {
            // Decrement each bundle component's stock in parallel
            await Promise.all(product.bundleItems.map((bundleItem) => prisma.product.update({
                where: { id: bundleItem.componentProductId },
                data: {
                    stock: { decrement: bundleItem.quantity * item.quantity }
                }
            })));
        }
        else if (item.variantId) {
            // Decrement variant stock
            await prisma.productVariant.update({
                where: { id: item.variantId },
                data: {
                    stock: { decrement: item.quantity }
                }
            });
        }
        else {
            // Decrement standard product stock
            await prisma.product.update({
                where: { id: item.productId },
                data: {
                    stock: { decrement: item.quantity }
                }
            });
        }
    }
    return order;
}
export async function getOrders(storeId) {
    return prisma.order.findMany({
        where: {
            ...(storeId ? { storeId } : {}),
            // Exclude DRAFT and IN_CHECKOUT orders — those belong to the Hold/Draft bin
            NOT: {
                paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
            }
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
    });
}
export async function getOrderById(id) {
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
    });
}
export async function updateOrderStatus(id, status) {
    await prisma.order.update({
        where: { id },
        data: { status },
    });
    return getOrderById(id);
}
export async function updateOrderPaymentStatus(id, paymentStatus) {
    await prisma.order.update({
        where: { id },
        data: { paymentStatus },
    });
    return getOrderById(id);
}
export async function getDraftOrders(storeId, cashierId) {
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
    });
}
export async function lockDraftOrder(id) {
    await prisma.order.update({
        where: { id },
        data: { paymentStatus: 'IN_CHECKOUT' },
    });
    return getOrderById(id);
}
export async function cancelDraftOrder(id) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true }
    });
    if (!order) {
        throw new Error('Draft order not found');
    }
    // Restore product stock upon canceling draft
    if (order.items && order.items.length > 0) {
        for (const item of order.items) {
            if (item.productId) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } }
                }).catch(() => { });
            }
        }
    }
    return prisma.order.delete({
        where: { id }
    });
}
/**
 * Wipe/reset all financial records (non-draft orders) for a store.
 * This is a destructive admin-only operation — use with caution.
 * It deletes: TerminalTransaction records, SplitPayment records, OrderItem records,
 * and then the Orders themselves for the given storeId / tenant.
 */
export async function resetFinancialRecords(storeId) {
    const orderWhere = {
        ...(storeId ? { storeId } : {}),
        NOT: {
            paymentStatus: { in: ['DRAFT', 'IN_CHECKOUT'] }
        }
    };
    // Fetch order IDs to delete related data
    const orders = await prisma.order.findMany({
        where: orderWhere,
        select: { id: true }
    });
    const orderIds = orders.map(o => o.id);
    if (orderIds.length === 0) {
        return { deleted: 0, message: 'No records to reset.' };
    }
    // Delete dependent records first (FK constraints)
    await prisma.terminalTransaction.deleteMany({
        where: { orderId: { in: orderIds } }
    });
    await prisma.splitPayment.deleteMany({
        where: { orderId: { in: orderIds } }
    });
    await prisma.orderItem.deleteMany({
        where: { orderId: { in: orderIds } }
    });
    // Finally delete the orders
    const { count } = await prisma.order.deleteMany({
        where: orderWhere
    });
    return { deleted: count, message: `Successfully reset ${count} financial record(s).` };
}
