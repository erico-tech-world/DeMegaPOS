import { Q } from '@nozbe/watermelondb'
import { database } from '../data/database'
import Order from '../models/Order'
import Product from '../models/Product'
import OrderItem from '../models/OrderItem'

export async function getOrCreateDraftOrder() {
    const orders = await database.collections.get<Order>('orders')
        .query(Q.where('is_draft', true))
        .fetch()

    if (orders.length > 0) {
        return orders[0]
    }

    let newOrder: Order
    await database.write(async () => {
        newOrder = await database.collections.get<Order>('orders').create(order => {
            order.isDraft = true
            order.status = 'NEW'
            order.paymentStatus = 'PENDING'
            order.totalAmount = 0
            order.storeId = 'DEFAULT_STORE' // Replace with actual store id
        })
    })

    return newOrder!
}

export async function addToCart(product: Product, quantity: number = 1, variantId?: string) {
    const order = await getOrCreateDraftOrder()

    await database.write(async () => {
        // Check if item already exists
        const query = [Q.where('order_id', order.id), Q.where('product_id', product.id)]
        if (variantId) query.push(Q.where('variant_id', variantId))

        const existingItems = await database.collections.get<OrderItem>('order_items')
            .query(...query)
            .fetch()

        // Use VIP price if customer is present on order (simplified logic)
        const effectivePrice = (order.customerId && product.vipPrice) ? product.vipPrice : product.price

        if (existingItems.length > 0) {
            await existingItems[0].update(item => {
                item.quantity += quantity
                item.price = effectivePrice
            })
        } else {
            await database.collections.get<OrderItem>('order_items').create(item => {
                item.orderId = order.id
                item.productId = product.id
                item.variantId = variantId
                item.quantity = quantity
                item.price = effectivePrice
            })
        }

        // Update order total
        const allItems = await database.collections.get<OrderItem>('order_items')
            .query(Q.where('order_id', order.id))
            .fetch()

        const total = allItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
        await order.update(o => {
            o.totalAmount = total
        })
    })
}

export type CheckoutData = {
    paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'WALLET' | 'SPLIT' | 'CREDIT'
    customerId?: string
    amountCash?: number
    amountTransfer?: number
}

export async function checkout(data: CheckoutData) {
    const order = await getOrCreateDraftOrder()
    await database.write(async () => {
        await order.update(o => {
            o.isDraft = false
            o.paymentMethod = data.paymentMethod
            o.customerId = data.customerId
            o.amountCash = data.amountCash
            o.amountTransfer = data.amountTransfer
            o.status = data.paymentMethod === 'CREDIT' ? 'UNPAID' : 'PAID'
            o.paymentStatus = data.paymentMethod === 'CREDIT' ? 'PENDING' : 'SUCCESS'
        })
    })
}
