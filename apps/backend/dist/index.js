import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import * as dotenv from 'dotenv';
dotenv.config();
const server = Fastify({
    logger: true,
});
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);
async function main() {
    await server.register(cors);
    await server.register(jwt, {
        secret: process.env.JWT_SECRET || 'supersecret',
    });
    await server.register(swagger, {
        openapi: {
            info: {
                title: 'DeMegaPOS API',
                description: 'Enterprise POS Platform API',
                version: '1.0.0',
            },
        },
    });
    await server.register(swaggerUi, {
        routePrefix: '/docs',
    });
    await server.register(websocket);
    server.get('/ws', { websocket: true }, (connection, req) => {
        console.log('New WS Client connected');
        connection.socket.on('message', message => {
            console.log('WS Message received:', message.toString());
        });
    });
    // Auth, Tenant, Inventory, Orders, Webhook & Payment Routes
    const authRoutes = await import('./modules/auth/routes.js');
    const tenantRoutes = await import('./modules/tenants/routes.js');
    const inventoryRoutes = await import('./modules/inventory/routes.js');
    const orderRoutes = await import('./modules/orders/routes.js');
    const staffRoutes = await import('./modules/staff/routes.js'); // Added staffRoutes import
    const webhookRoutes = await import('./modules/webhooks/routes.js');
    const paymentRoutes = await import('./modules/payments/routes.js');
    const syncRoutes = await import('./modules/sync/routes.js');
    const customerRoutes = await import('./modules/customers/routes.js');
    server.register(authRoutes, { prefix: '/auth' });
    server.register(tenantRoutes, { prefix: '/tenants' });
    server.register(inventoryRoutes, { prefix: '/inventory' });
    server.register(orderRoutes, { prefix: '/orders' });
    server.register(staffRoutes, { prefix: '/staff' });
    server.register(webhookRoutes, { prefix: '/webhooks' });
    server.register(paymentRoutes, { prefix: '/payments' });
    server.register(syncRoutes, { prefix: '/sync' });
    server.register(customerRoutes, { prefix: '/customers' });
    // Helper for broadcasting WebSocket events
    server.decorate('broadcast', (event, payload) => {
        for (const client of server.websocketServer.clients) {
            client.send(JSON.stringify({ event, payload }));
        }
    });
    // Protected Routes & Scoping Hook
    server.addHook('onRequest', async (request, reply) => {
        if (request.url.startsWith('/auth') || request.url.startsWith('/docs') || request.url === '/health') {
            return;
        }
        try {
            await request.jwtVerify();
            // Set Request Context for automatic scoping in Prisma
            const { tenantId, branchId, role } = request.user;
            await new Promise((resolve) => {
                import('@demegapos/db').then(({ requestContext }) => {
                    requestContext.run({
                        tenantId,
                        branchId,
                        role: role
                    }, () => {
                        resolve();
                    });
                });
            });
        }
        catch (err) {
            reply.send(err);
        }
    });
    server.get('/health', async () => {
        return { status: 'OK' };
    });
    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening at http://localhost:${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
}
main();
