import { Database } from '@nozbe/watermelondb'
// This import will resolve to adapter.native.ts on native, and adapter.ts on web
import adapter from './adapter'

import Product from '../models/Product'
import Category from '../models/Category'
import Order from '../models/Order'
import OrderItem from '../models/OrderItem'

export const database = new Database({
    adapter,
    modelClasses: [Product, Category, Order, OrderItem],
})
