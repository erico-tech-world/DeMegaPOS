import { Model, Q } from '@nozbe/watermelondb'
import { field, children, readonly, date } from '@nozbe/watermelondb/decorators'

export default class Order extends Model {
    static table = 'orders'
    static associations = {
        order_items: { type: 'has_many', foreignKey: 'order_id' },
    }

    @field('total_amount') totalAmount!: number
    @field('payment_method') paymentMethod?: string
    @field('customer_id') customerId?: string
    @field('amount_cash') amountCash?: number
    @field('amount_transfer') amountTransfer?: number
    @field('status') status!: string
    @field('price') price!: number
    @field('vip_price') vipPrice?: number
    @field('cost_price') costPrice?: number
    @field('sku') sku?: string
    @field('barcode') barcode?: string
    @field('stock') stock!: number
    @field('payment_status') paymentStatus!: string
    @field('store_id') storeId!: string
    @field('is_draft') isDraft!: boolean
    @field('server_id') serverId?: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    @children('order_items') items!: any
}
