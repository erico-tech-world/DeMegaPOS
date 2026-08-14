import { Model } from '@nozbe/watermelondb'
import { field, readonly, date } from '@nozbe/watermelondb/decorators'

export default class Customer extends Model {
    static table = 'customers'

    @field('name') name!: string
    @field('phone') phone?: string
    @field('email') email?: string
    @field('wallet_balance') walletBalance!: number
    @field('server_id') serverId?: string

    @readonly @date('created_at') createdAt!: Date
    @readonly @date('updated_at') updatedAt!: Date
}
