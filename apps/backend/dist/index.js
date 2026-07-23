import * as dotenv from 'dotenv';
dotenv.config({ override: true }); // Load apps/backend/.env — CWD is apps/backend/ when run via turbo
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
const server = Fastify({
    logger: true,
    bodyLimit: 10485760, // Allow up to 10MB payloads for Base64 image uploads
});
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);
async function main() {
    await server.register(cors, {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
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
        const socket = connection?.socket || connection?.raw || connection;
        if (socket && typeof socket.on === 'function') {
            socket.on('message', (message) => {
                console.log('WS Message received:', message.toString());
            });
        }
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
    server.register(authRoutes.default, { prefix: '/auth' });
    server.register(tenantRoutes.default, { prefix: '/tenants' });
    server.register(inventoryRoutes.default, { prefix: '/inventory' });
    server.register(orderRoutes.default, { prefix: '/orders' });
    server.register(staffRoutes.default, { prefix: '/staff' });
    server.register(webhookRoutes.default, { prefix: '/webhooks' });
    server.register(paymentRoutes.default, { prefix: '/payments' });
    server.register(syncRoutes.default, { prefix: '/sync' });
    server.register(customerRoutes.default, { prefix: '/customers' });
    // Helper for broadcasting WebSocket events safely
    server.decorate('broadcast', (event, payload) => {
        if (!server.websocketServer)
            return;
        for (const client of server.websocketServer.clients) {
            if (client.readyState === 1) { // 1 === WebSocket.OPEN
                try {
                    client.send(JSON.stringify({ event, payload }));
                }
                catch (err) {
                    console.error('Error broadcasting to WS client:', err);
                }
            }
        }
    });
    // JWT guard — verifies token for all non-auth routes
    server.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') {
            return;
        }
        if (request.url.startsWith('/auth') || request.url.startsWith('/docs') || request.url === '/health' || request.url.startsWith('/ws') || request.url.startsWith('/payments/webhook')) {
            return;
        }
        try {
            await request.jwtVerify();
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
