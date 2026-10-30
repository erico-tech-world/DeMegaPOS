import { Model } from '@nozbe/watermelondb'
import { field, children } from '@nozbe/watermelondb/decorators'

export default class Category extends Model {
    static table = 'categories'
    static associations = {
        products: { type: 'has_many', foreignKey: 'category_id' },
    }

    @field('name') name!: string
    @field('server_id') serverId?: string

    @children('products') products!: any
}
