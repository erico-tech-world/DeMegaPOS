import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import websocket from '@fastify/websocket'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import * as dotenv from 'dotenv'

dotenv.config()

declare module 'fastify' {
    interface FastifyInstance {
        broadcast(event: string, payload: any): void
    }
}

const server = Fastify({
    logger: true,
})

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

async function main() {
    // ─── Dynamic CORS Allowlist ────────────────────────────────────────────────
    // Reads from environment variables so no code change is needed when adding
    // a custom domain.  Set FRONTEND_URL and/or ALLOWED_ORIGINS (comma-separated)
    // on your host (Render, Railway, etc.).
    const buildAllowedOrigins = (): string[] => {
        const origins = new Set<string>([
            // Local development
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:4173',
            'http://localhost:3000',
            // Netlify production deployment
            'https://demegapos.netlify.app',
        ]);

        // FRONTEND_URL env variable (single URL configured on the host)
        if (process.env.FRONTEND_URL) {
            process.env.FRONTEND_URL.split(',').map(u => u.trim()).filter(Boolean).forEach(u => origins.add(u));
        }

        // ALLOWED_ORIGINS env variable (comma-separated list for multiple domains)
        if (process.env.ALLOWED_ORIGINS) {
            process.env.ALLOWED_ORIGINS.split(',').map(u => u.trim()).filter(Boolean).forEach(u => origins.add(u));
        }

        return Array.from(origins);
    };

    const allowedOrigins = buildAllowedOrigins();
    console.log('[CORS] Allowed origins:', allowedOrigins);

    await server.register(cors, {
        origin: (requestOrigin, cb) => {
            // Allow requests with no Origin (server-to-server, Postman, mobile apps)
            if (!requestOrigin) return cb(null, true);
            if (allowedOrigins.includes(requestOrigin)) return cb(null, true);
            // Allow any *.netlify.app preview deploy URLs (branch deploys)
            if (requestOrigin.endsWith('.netlify.app')) return cb(null, true);
            // Allow any localhost port for development
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)) return cb(null, true);
            console.warn(`[CORS] Blocked origin: ${requestOrigin}`);
            cb(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        preflight: true,
        strictPreflight: false,
    })

    await server.register(jwt, {
        secret: process.env.JWT_SECRET || 'supersecret',
    })

    await server.register(swagger, {
        openapi: {
            info: {
                title: 'DeMegaPOS API',
                description: 'Enterprise POS Platform API',
                version: '1.0.0',
            },
        },
    })

    await server.register(swaggerUi, {
        routePrefix: '/docs',
    })

    await server.register(websocket)

    server.get('/ws', { websocket: true }, (connection, req) => {
        console.log('New WS Client connected')
        connection.socket.on('message', (message: Buffer) => {
            console.log('WS Message received:', message.toString())
        })
    })

    // Auth, Tenant, Inventory, Orders, Webhook & Payment Routes
    const authRoutes = await import('./modules/auth/routes.js')
    const tenantRoutes = await import('./modules/tenants/routes.js')
    const inventoryRoutes = await import('./modules/inventory/routes.js')
    const orderRoutes = await import('./modules/orders/routes.js')
    const staffRoutes = await import('./modules/staff/routes.js') // Added staffRoutes import
    const webhookRoutes = await import('./modules/webhooks/routes.js')
    const paymentRoutes = await import('./modules/payments/routes.js')

    const syncRoutes = await import('./modules/sync/routes.js')
    const customerRoutes = await import('./modules/customers/routes.js')
    const integrationRoutes = await import('./modules/integrations/routes.js')
    const platformRoutes = await import('./modules/platform/routes.js')

    server.register(authRoutes.default, { prefix: '/auth' })
    server.register(tenantRoutes.default, { prefix: '/tenants' })
    server.register(inventoryRoutes.default, { prefix: '/inventory' })
    server.register(orderRoutes.default, { prefix: '/orders' })
    server.register(staffRoutes.default, { prefix: '/staff' })
    server.register(webhookRoutes.default, { prefix: '/webhooks' })
    server.register(paymentRoutes.default, { prefix: '/payments' })
    server.register(syncRoutes.default, { prefix: '/sync' })
    server.register(customerRoutes.default, { prefix: '/customers' })
    server.register(integrationRoutes.default, { prefix: '/integrations' })
    server.register(platformRoutes.default, { prefix: '/platform' })

    // Helper for broadcasting WebSocket events safely
    server.decorate('broadcast', (event: string, payload: any) => {
        if (!server.websocketServer) return
        for (const client of server.websocketServer.clients) {
            if (client.readyState === 1) { // 1 === WebSocket.OPEN
                try {
                    client.send(JSON.stringify({ event, payload }))
                } catch (err) {
                    console.error('Error broadcasting to WS client:', err)
                }
            }
        }
    })

    // JWT guard — verifies token for all non-auth routes
    server.addHook('onRequest', async (request, reply) => {
        if (request.method === 'OPTIONS') {
            return
        }
        if (request.url.startsWith('/auth') || request.url.startsWith('/platform') || request.url.startsWith('/docs') || request.url.startsWith('/health') || request.url.startsWith('/ws')) {
            return
        }
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })

    server.get('/health', async () => {
        const resendKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || '').trim()
        const gmailUser = (process.env.FALLBACK_SMTP_USER || process.env.GMAIL_USER || '').trim()
        const gmailPass = (process.env.FALLBACK_SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim()

        return {
            status: 'OK',
            mail: {
                preferredProvider: process.env.MAIL_PROVIDER || 'RESEND',
                resend: {
                    configured: resendKey.startsWith('re_'),
                    from: process.env.SMTP_FROM || 'DeMegaPOS <onboarding@resend.dev>',
                },
                gmail: {
                    configured: Boolean(gmailUser && gmailPass),
                    user: gmailUser ? `${gmailUser.split('@')[0]}@...` : '(not configured)',
                },
                appBaseUrl: process.env.APP_BASE_URL || process.env.FRONTEND_URL || '(not set)',
            },
            version: '2.1.0-hybrid-mail',
        }
    })

    // Mail diagnostic endpoint — tests full dispatch pipeline (Resend -> Gmail fallback)
    // Query param ?to=email@domain.com allows testing any recipient
    server.get('/health/mail', async (request: any, reply) => {
        const { sendMail } = await import('./modules/../lib/mail.js')
        const targetEmail = (request.query?.to as string) || 'delivered@resend.dev'
        try {
            const result = await sendMail({
                to: targetEmail,
                subject: '[DeMegaPOS] Mail Diagnostic Test',
                html: '<p>DeMegaPOS mail delivery is operational via the Hybrid Mailer (Resend / Gmail SMTP fallback).</p>',
            })
            return reply.send({
                success: true,
                recipient: targetEmail,
                providerUsed: result.provider,
                messageId: result.messageId,
                message: `Mail dispatched successfully to ${targetEmail} via ${result.provider}.`
            })
        } catch (err: any) {
            return reply.status(500).send({
                success: false,
                recipient: targetEmail,
                error: err.message || String(err)
            })
        }
    })

    try {
        const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
        await server.listen({ port, host: '0.0.0.0' })
        console.log(`Server listening at http://localhost:${port}`)
    } catch (err) {
        server.log.error(err)
        process.exit(1)
    }
}

main()
