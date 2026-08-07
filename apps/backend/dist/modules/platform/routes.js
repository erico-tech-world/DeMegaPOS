import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
export default async function platformRoutes(app) {
    /**
     * POST /platform/auth
     * Authenticates with PLATFORM_SECRET or dynamically generated PlatformKey in database.
     * Issues platform-scoped JWT isolated from tenant auth.
     */
    app.post('/auth', {
        schema: {
            body: z.object({
                secretKey: z.string().min(1),
            }),
        },
    }, async (request, reply) => {
        const { secretKey } = request.body;
        const envSecret = process.env.PLATFORM_SECRET || process.env.VITE_PLATFORM_SECRET || 'demega-platform-secret-2026';
        let isValid = secretKey === envSecret;
        // Check database for active dynamically generated keys
        if (!isValid) {
            try {
                const dbKey = await prisma.platformKey.findUnique({
                    where: { secretKey }
                });
                if (dbKey && (!dbKey.expiresAt || new Date(dbKey.expiresAt) > new Date())) {
                    if (!dbKey.isSingleUse || !dbKey.isUsed) {
                        isValid = true;
                        // Mark single use key as used
                        if (dbKey.isSingleUse) {
                            await prisma.platformKey.update({
                                where: { id: dbKey.id },
                                data: { isUsed: true }
                            });
                        }
                    }
                }
            }
            catch (err) {
                // If table is not created yet, default to envSecret
            }
        }
        if (!isValid) {
            return reply.code(401).send({ message: 'Invalid platform secret key.' });
        }
        const token = app.jwt.sign({ isPlatformAdmin: true, role: 'PLATFORM_ADMIN' }, { expiresIn: '8h' });
        return reply.send({ token, role: 'PLATFORM_ADMIN' });
    });
    /**
     * POST /platform/keys/generate
     * Generates a new dynamic secret key for platform control tower access.
     */
    app.post('/keys/generate', async (request, reply) => {
        try {
            await request.jwtVerify();
            const user = request.user;
            if (!user.isPlatformAdmin) {
                return reply.code(403).send({ message: 'Platform admin access required.' });
            }
        }
        catch {
            return reply.code(401).send({ message: 'Unauthorized.' });
        }
        const { label, isSingleUse, customSecret } = request.body || {};
        const crypto = await import('crypto');
        const generatedSecret = customSecret || `DMG-PLAT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        try {
            const newKey = await prisma.platformKey.create({
                data: {
                    label: label || 'Dynamic Platform Key',
                    secretKey: generatedSecret,
                    isSingleUse: !!isSingleUse,
                }
            });
            return reply.code(201).send({ key: newKey });
        }
        catch (e) {
            return reply.code(500).send({ message: e.message || 'Failed to generate key' });
        }
    });
    /**
     * GET /platform/keys
     * Lists active platform access keys.
     */
    app.get('/keys', async (request, reply) => {
        try {
            await request.jwtVerify();
            const user = request.user;
            if (!user.isPlatformAdmin) {
                return reply.code(403).send({ message: 'Platform admin access required.' });
            }
        }
        catch {
            return reply.code(401).send({ message: 'Unauthorized.' });
        }
        try {
            const keys = await prisma.platformKey.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return reply.send({ keys });
        }
        catch {
            return reply.send({ keys: [] });
        }
    });
    /**
     * GET /platform/stats
     * Returns global SaaS-level KPIs. Requires platform JWT.
     */
    app.get('/stats', async (request, reply) => {
        // Verify platform JWT
        try {
            await request.jwtVerify();
            const user = request.user;
            if (!user.isPlatformAdmin) {
                return reply.code(403).send({ message: 'Platform admin access required.' });
            }
        }
        catch {
            return reply.code(401).send({ message: 'Unauthorized.' });
        }
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalTenants, totalStores, totalUsers, totalOrdersCount, activeTenantsData, allTenants, platformRevenue, dbPingStart,] = await Promise.all([
            prisma.tenant.count(),
            prisma.store.count(),
            prisma.user.count(),
            prisma.order.count({ where: { paymentStatus: { in: ['SUCCESS', 'PAID'] } } }),
            prisma.order.groupBy({
                by: ['storeId'],
                where: { createdAt: { gte: thirtyDaysAgo } },
                _count: true,
            }),
            prisma.tenant.findMany({
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    stores: {
                        select: {
                            id: true,
                            name: true,
                            _count: { select: { orders: true } },
                            orders: {
                                where: { paymentStatus: { in: ['SUCCESS', 'PAID'] } },
                                select: { totalAmount: true },
                            },
                        },
                    },
                    users: { select: { id: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.order.aggregate({
                where: { paymentStatus: { in: ['SUCCESS', 'PAID'] } },
                _sum: { totalAmount: true },
            }),
            Promise.resolve(Date.now()),
        ]);
        const dbPingLatency = Date.now() - dbPingStart;
        // Collect unique active storeIds in last 30 days
        const activeStoreIds = new Set(activeTenantsData.map(r => r.storeId));
        // Mark tenants as active if any of their stores had orders in last 30 days
        const tenantDirectory = allTenants.map(tenant => {
            const isActive30d = tenant.stores.some(s => activeStoreIds.has(s.id));
            const totalRevenue = tenant.stores.reduce((sum, store) => sum + store.orders.reduce((s, o) => s + Number(o.totalAmount), 0), 0);
            const orderCount = tenant.stores.reduce((sum, store) => sum + store._count.orders, 0);
            return {
                id: tenant.id,
                name: tenant.name,
                storeCount: tenant.stores.length,
                userCount: tenant.users.length,
                orderCount,
                revenue: totalRevenue,
                isActive30d,
                joinedAt: tenant.createdAt,
            };
        });
        const activeTenants30d = tenantDirectory.filter(t => t.isActive30d).length;
        return reply.send({
            kpis: {
                totalTenants,
                activeTenants30d,
                totalStores,
                totalUsers,
                totalOrders: totalOrdersCount,
                platformGMV: Number(platformRevenue._sum.totalAmount || 0),
            },
            health: {
                dbPingLatency,
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version,
            },
            tenantDirectory,
        });
    });
}
