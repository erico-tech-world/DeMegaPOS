import { Model } from '@nozbe/watermelondb'
import { field, readonly, date, relation } from '@nozbe/watermelondb/decorators'

export default class Product extends Model {
    static table = 'products'

    @field('name') name!: string
    @field('price') price!: number
    @field('vip_price') vipPrice?: number
    @field('cost_price') costPrice?: number
    @field('sku') sku?: string
    @field('barcode') barcode?: string
    @field('stock') stock!: number
    @field('category_id') categoryId!: string
    @field('server_id') serverId?: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date

    @relation('categories', 'category_id') category!: any
}
