import { appSchema, tableSchema } from '@nozbe/watermelondb'

export default appSchema({
    version: 2,
    tables: [
        tableSchema({
            name: 'products',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'price', type: 'number' },
                { name: 'vip_price', type: 'number', isOptional: true },
                { name: 'cost_price', type: 'number', isOptional: true },
                { name: 'sku', type: 'string', isOptional: true },
                { name: 'barcode', type: 'string', isOptional: true },
                { name: 'stock', type: 'number' },
                { name: 'category_id', type: 'string', isIndexed: true },
                { name: 'server_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'categories',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'server_id', type: 'string', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'orders',
            columns: [
                { name: 'total_amount', type: 'number' },
                { name: 'payment_method', type: 'string', isOptional: true },
                { name: 'customer_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'amount_cash', type: 'number', isOptional: true },
                { name: 'amount_transfer', type: 'number', isOptional: true },
                { name: 'status', type: 'string' },
                { name: 'payment_status', type: 'string' },
                { name: 'store_id', type: 'string' },
                { name: 'is_draft', type: 'boolean' },
                { name: 'server_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'customers',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'phone', type: 'string', isOptional: true },
                { name: 'email', type: 'string', isOptional: true },
                { name: 'wallet_balance', type: 'number' },
                { name: 'server_id', type: 'string', isIndexed: true },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),
        tableSchema({
            name: 'order_items',
            columns: [
                { name: 'order_id', type: 'string', isIndexed: true },
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'variant_id', type: 'string', isOptional: true },
                { name: 'quantity', type: 'number' },
                { name: 'price', type: 'number' },
            ],
        }),
    ],
})
