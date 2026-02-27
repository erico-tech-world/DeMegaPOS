import { FastifyInstance } from 'fastify'
import {
    createCategorySchema,
    categoryResponseSchema,
    createProductSchema,
    productResponseSchema,
    stockAdjustmentSchema
} from './schemas.js'
import {
    createCategory,
    getCategories,
    createProduct,
    getProducts,
    createStockAdjustment
} from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

export default async function inventoryRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    // Categories
    server.post(
        '/categories',
        {
            schema: {
                body: createCategorySchema,
                response: {
                    201: categoryResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const category = await createCategory({ ...request.body, tenantId })
            return reply.code(201).send(category)
        }
    )

    server.get(
        '/categories',
        {
            schema: {
                response: {
                    200: {
                        type: 'array',
                        items: categoryResponseSchema,
                    },
                },
            },
        },
        async () => {
            return getCategories()
        }
    )

    // Products
    server.post(
        '/products',
        {
            schema: {
                body: createProductSchema,
                response: {
                    201: productResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const product = await createProduct({ ...request.body, tenantId })
            return reply.code(201).send(product)
        }
    )

    server.get(
        '/products',
        {
            schema: {
                response: {
                    200: {
                        type: 'array',
                        items: productResponseSchema,
                    },
                },
            },
        },
        async () => {
            return getProducts()
        }
    )

    // Stock Adjustments
    server.post(
        '/stock-adjustments',
        {
            schema: {
                body: stockAdjustmentSchema,
                response: {
                    201: z.any(), // Simplified for now
                },
            },
        },
        async (request, reply) => {
            const { id: userId, tenantId } = request.user as any
            const adjustment = await createStockAdjustment({ ...request.body, tenantId }, userId)
            return reply.code(201).send(adjustment)
        }
    )
}
import { z } from 'zod'
