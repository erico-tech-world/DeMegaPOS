import { z } from 'zod';
import { createCategorySchema, categoryResponseSchema, createProductSchema, updateProductSchema, productResponseSchema, stockAdjustmentSchema } from './schemas.js';
import { createCategory, getCategories, createProduct, getProducts, updateProduct, deleteProduct, createStockAdjustment } from './service.js';
export default async function inventoryRoutes(app) {
    const server = app.withTypeProvider();
    // Categories
    server.post('/categories', {
        schema: {
            body: createCategorySchema,
            response: {
                201: categoryResponseSchema,
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const category = await createCategory({ ...request.body, tenantId });
        return reply.code(201).send(category);
    });
    server.get('/categories', {
        schema: {
            response: {
                200: z.array(categoryResponseSchema),
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        return getCategories(tenantId);
    });
    // Products
    server.post('/products', {
        schema: {
            body: createProductSchema,
            response: {
                201: productResponseSchema,
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const product = await createProduct({ ...request.body, tenantId });
        // @ts-ignore
        server.broadcast('PRODUCT_CREATED', product);
        return reply.code(201).send(product);
    });
    server.get('/products', {
        schema: {
            response: {
                200: z.array(productResponseSchema),
            },
        },
    }, async (request) => {
        const tenantId = request.user.tenantId;
        return getProducts(tenantId);
    });
    server.put('/products/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            body: updateProductSchema,
            response: {
                200: productResponseSchema,
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        const product = await updateProduct(request.params.id, tenantId, request.body);
        // @ts-ignore
        server.broadcast('PRODUCT_UPDATED', product);
        return reply.code(200).send(product);
    });
    server.delete('/products/:id', {
        schema: {
            params: z.object({ id: z.string() }),
            response: {
                204: z.any(),
            },
        },
    }, async (request, reply) => {
        const tenantId = request.user.tenantId;
        await deleteProduct(request.params.id, tenantId);
        // @ts-ignore
        server.broadcast('PRODUCT_DELETED', { id: request.params.id });
        return reply.code(204).send();
    });
    // Stock Adjustments
    server.post('/stock-adjustments', {
        schema: {
            body: stockAdjustmentSchema,
            response: {
                201: z.any(), // Simplified for now
            },
        },
    }, async (request, reply) => {
        const { id: userId, tenantId } = request.user;
        const adjustment = await createStockAdjustment({ ...request.body, tenantId }, userId);
        return reply.code(201).send(adjustment);
    });
}
