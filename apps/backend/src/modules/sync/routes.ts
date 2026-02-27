import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '@demegapos/db'

export default async function syncRoutes(server: FastifyInstance) {
    server.get('/pull', async (request: any) => {
        const { lastPulledAt } = request.query as { lastPulledAt?: string }
        const lastPulledAtDate = lastPulledAt ? new Date(parseInt(lastPulledAt)) : new Date(0)

        // Fetch changes for each table
        const [products, orders, customers] = await Promise.all([
            prisma.product.findMany({
                where: { updatedAt: { gt: lastPulledAtDate } },
                include: { variants: true }
            }),
            prisma.order.findMany({
                where: { updatedAt: { gt: lastPulledAtDate } },
                include: { items: true, splitPayments: true }
            }),
            prisma.customer.findMany({
                where: { updatedAt: { gt: lastPulledAtDate } }
            })
        ])

        return {
            changes: {
                products: {
                    created: products.filter(p => p.createdAt > lastPulledAtDate).map(p => ({
                        ...p,
                        price: Number(p.price),
                        costPrice: p.costPrice ? Number(p.costPrice) : null,
                        vipPrice: p.vipPrice ? Number(p.vipPrice) : null
                    })),
                    updated: products.filter(p => p.createdAt <= lastPulledAtDate).map(p => ({
                        ...p,
                        price: Number(p.price),
                        costPrice: p.costPrice ? Number(p.costPrice) : null,
                        vipPrice: p.vipPrice ? Number(p.vipPrice) : null
                    })),
                    deleted: []
                },
                orders: {
                    created: orders.filter(o => o.createdAt > lastPulledAtDate).map(o => ({
                        ...o,
                        totalAmount: Number(o.totalAmount),
                        items: o.items.map(i => ({ ...i, price: Number(i.price) }))
                    })),
                    updated: orders.filter(o => o.createdAt <= lastPulledAtDate).map(o => ({
                        ...o,
                        totalAmount: Number(o.totalAmount),
                        items: o.items.map(i => ({ ...i, price: Number(i.price) }))
                    })),
                    deleted: []
                },
                customers: {
                    created: customers.filter(c => c.createdAt > lastPulledAtDate).map(c => ({
                        ...c,
                        walletBalance: Number(c.walletBalance)
                    })),
                    updated: customers.filter(c => c.createdAt <= lastPulledAtDate).map(c => ({
                        ...c,
                        walletBalance: Number(c.walletBalance)
                    })),
                    deleted: []
                }
            },
            timestamp: Date.now()
        }
    })

    server.post('/push', async (request: any) => {
        const { changes } = request.body

        // Apply changes in a transaction
        await prisma.$transaction(async (tx) => {
            if (changes.orders) {
                const { created, updated } = changes.orders
                for (const order of [...created, ...updated]) {
                    // Delete existing items and split payments before upserting (simplified conflict resolution)
                    await (tx as any).orderItem.deleteMany({ where: { orderId: order.id } })
                    await (tx as any).splitPayment.deleteMany({ where: { orderId: order.id } })

                    await (tx as any).order.upsert({
                        where: { id: order.id },
                        create: {
                            id: order.id,
                            totalAmount: order.totalAmount,
                            paymentMethod: order.paymentMethod,
                            customerId: order.customerId,
                            storeId: order.storeId,
                            status: order.status,
                            paymentStatus: order.paymentStatus,
                            createdAt: new Date(order.createdAt),
                            updatedAt: new Date(),
                            items: {
                                create: (order.items || []).map((item: any) => ({
                                    productId: item.productId,
                                    variantId: item.variantId,
                                    quantity: item.quantity,
                                    price: item.price
                                }))
                            },
                            splitPayments: {
                                create: (order.splitPayments || []).map((sp: any) => ({
                                    method: sp.method,
                                    amount: sp.amount,
                                    reference: sp.reference
                                }))
                            }
                        },
                        update: {
                            totalAmount: order.totalAmount,
                            paymentMethod: order.paymentMethod,
                            customerId: order.customerId,
                            status: order.status,
                            paymentStatus: order.paymentStatus,
                            updatedAt: new Date(),
                            items: {
                                create: (order.items || []).map((item: any) => ({
                                    productId: item.productId,
                                    variantId: item.variantId,
                                    quantity: item.quantity,
                                    price: item.price
                                }))
                            },
                            splitPayments: {
                                create: (order.splitPayments || []).map((sp: any) => ({
                                    method: sp.method,
                                    amount: sp.amount,
                                    reference: sp.reference
                                }))
                            }
                        }
                    })
                }
            }

            if (changes.customers) {
                const { created, updated } = changes.customers
                for (const customer of [...created, ...updated]) {
                    await (tx as any).customer.upsert({
                        where: { id: customer.id },
                        create: {
                            id: customer.id,
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                            walletBalance: customer.walletBalance,
                            tenantId: customer.tenantId,
                            createdAt: new Date(customer.createdAt),
                            updatedAt: new Date()
                        },
                        update: {
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                            walletBalance: customer.walletBalance,
                            updatedAt: new Date()
                        }
                    })
                }
            }
        })

        return { status: 'ok' }
    })
}
