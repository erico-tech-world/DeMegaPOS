import { Model } from '@nozbe/watermelondb'
import { field, relation } from '@nozbe/watermelondb/decorators'

export default class OrderItem extends Model {
    static table = 'order_items'
    static associations = {
        orders: { type: 'belongs_to', key: 'order_id' },
    }

    @field('order_id') orderId!: string
    @field('product_id') productId!: string
    @field('variant_id') variantId?: string
    @field('quantity') quantity!: number
    @field('price') price!: number

    @relation('orders', 'order_id') order!: any
    @relation('products', 'product_id') product!: any
}
