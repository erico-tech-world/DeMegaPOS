import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
    createCategorySchema,
    updateCategorySchema,
    transferCategorySchema,
    categoryResponseSchema,
    createProductSchema,
    updateProductSchema,
    productResponseSchema,
    stockAdjustmentSchema,
    toggleBranchActiveSchema
} from './schemas.js'
import {
    createCategory,
    getCategories,
    updateCategory,
    transferCategoryItems,
    deleteCategory,
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    createStockAdjustment,
    setBranchProductActive
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
                    200: z.array(categoryResponseSchema),
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            return getCategories(tenantId)
        }
    )

    server.put(
        '/categories/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: updateCategorySchema,
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const updated = await updateCategory(request.params.id, tenantId, request.body)
            return reply.send(updated)
        }
    )

    server.patch(
        '/categories/transfer',
        {
            schema: {
                body: transferCategorySchema,
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const { productIds, targetCategoryId } = request.body
            const result = await transferCategoryItems(tenantId, productIds, targetCategoryId)
            return reply.send({ success: true, count: result.count })
        }
    )

    server.delete(
        '/categories/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                querystring: z.object({ reassignToCategoryId: z.string().optional() }),
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const { reassignToCategoryId } = request.query as { reassignToCategoryId?: string }
            await deleteCategory(request.params.id, tenantId, reassignToCategoryId)
            return reply.send({ success: true })
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

            // @ts-ignore
            server.broadcast('PRODUCT_CREATED', product)

            return reply.code(201).send(product)
        }
    )

    function resolveEffectiveStoreId(user: any, requestedStoreId?: string): { storeId?: string; isForbidden?: boolean } {
        const userRole = user?.role || ''
        const isElevated = ['SUPER_ADMIN', 'OWNER', 'REGIONAL_MANAGER'].includes(userRole) || Boolean(user?.hasMultiBranchAccess)
        if (isElevated) {
            if (requestedStoreId === 'ALL' || requestedStoreId === 'all' || requestedStoreId?.trim() === '') {
                return { storeId: undefined }
            }
            return { storeId: requestedStoreId }
        }
        const userBranchId = user?.branchId
        if (userBranchId) {
            if (requestedStoreId && requestedStoreId !== 'ALL' && requestedStoreId !== 'all' && requestedStoreId.trim() !== '' && requestedStoreId !== userBranchId) {
                return { storeId: userBranchId, isForbidden: true }
            }
            return { storeId: userBranchId }
        }
        return { storeId: requestedStoreId }
    }

    server.get(
        '/products',
        {
            schema: {
                querystring: z.object({
                    storeId: z.string().optional(),
                    branchId: z.string().optional(),
                }),
                response: {
                    200: z.array(productResponseSchema),
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const query = (request.query || {}) as { storeId?: string; branchId?: string }
            const requestedStoreId = query.storeId || query.branchId

            const { storeId, isForbidden } = resolveEffectiveStoreId(request.user, requestedStoreId)
            if (isForbidden) {
                return reply.code(403).send({ message: 'Forbidden: Cannot access inventory for another branch.' } as any)
            }

            return getProducts(tenantId, storeId)
        }
    )

    server.put(
        '/products/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: updateProductSchema,
                response: {
                    200: productResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            const product = await updateProduct(request.params.id, tenantId, request.body)
            // @ts-ignore
            server.broadcast('PRODUCT_UPDATED', product)
            return reply.code(200).send(product)
        }
    )

    server.delete(
        '/products/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                response: {
                    204: z.any(),
                },
            },
        },
        async (request, reply) => {
            const tenantId = (request.user as any).tenantId
            await deleteProduct(request.params.id, tenantId)
            // @ts-ignore
            server.broadcast('PRODUCT_DELETED', { id: request.params.id })
            return reply.code(204).send()
        }
    )

    // Stock Adjustments
    server.post(
        '/stock-adjustments',
        {
            schema: {
                body: stockAdjustmentSchema,
                response: {
                    201: z.any(),
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { id: userId, tenantId, role, branchId: userBranchId, hasMultiBranchAccess } = request.user as any
            const isElevated = ['SUPER_ADMIN', 'OWNER', 'REGIONAL_MANAGER'].includes(role) || Boolean(hasMultiBranchAccess)
            const body = request.body as any

            if (!isElevated && userBranchId) {
                if (body.storeId && body.storeId !== userBranchId) {
                    return reply.code(403).send({ message: 'Forbidden: Cannot adjust stock for another branch.' } as any)
                }
                body.storeId = userBranchId
            }

            const adjustment = await createStockAdjustment({ ...body, tenantId }, userId)
            // @ts-ignore
            server.broadcast('STOCK_ADJUSTED', adjustment)
            return reply.code(201).send(adjustment)
        }
    )

    // Toggle product active status per branch
    server.patch(
        '/products/:id/branch-active',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: toggleBranchActiveSchema,
                response: {
                    200: z.any(),
                    403: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { tenantId, role, branchId: userBranchId, hasMultiBranchAccess } = request.user as any
            const isElevated = ['SUPER_ADMIN', 'OWNER', 'REGIONAL_MANAGER', 'INVENTORY_MANAGER'].includes(role) || Boolean(hasMultiBranchAccess)
            const isBranchManager = role === 'BRANCH_MANAGER'

            if (!isElevated && !isBranchManager) {
                return reply.code(403).send({ message: 'Forbidden: Insufficient privileges to toggle branch item availability.' } as any)
            }

            const { storeId, isActive } = request.body as { storeId: string; isActive: boolean }
            if (isBranchManager && !isElevated && userBranchId && storeId !== userBranchId) {
                return reply.code(403).send({ message: 'Forbidden: You may only toggle products for your assigned branch.' } as any)
            }

            const result = await setBranchProductActive(request.params.id, storeId, isActive, tenantId)
            // @ts-ignore
            server.broadcast('PRODUCT_BRANCH_STATUS_UPDATED', {
                productId: request.params.id,
                storeId,
                isActive
            })
            return reply.code(200).send(result)
        }
    )
}
