import { PrismaClient } from '@prisma/client';

async function testDirectIPs() {
    const urls = [
        'postgresql://postgres.iebuntdyiynwcyeyhdey:Admin-admin1%23@34.241.16.247:5432/postgres?sslmode=require',
        'postgresql://postgres.iebuntdyiynwcyeyhdey:Admin-admin1%23@34.241.16.247:6543/postgres?pgbouncer=true&sslmode=require',
        'postgresql://postgres.iebuntdyiynwcyeyhdey:Admin-admin1%23@108.128.216.176:5432/postgres?sslmode=require',
        'postgresql://postgres.iebuntdyiynwcyeyhdey:Admin-admin1%23@108.128.216.176:6543/postgres?pgbouncer=true&sslmode=require'
    ];

    for (const url of urls) {
        console.log('\n----------------------------------------');
        console.log('Testing URL:', url);
        const p = new PrismaClient({
            datasources: { db: { url } },
            log: ['info', 'warn', 'error']
        });

        try {
            await p.$connect();
            console.log('✅ CONNECTED!');

            const users = await p.user.findMany({
                take: 10,
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    tenant: true,
                    branch: true,
                    activity: { select: { id: true } },
                    sessions: { select: { id: true } },
                    stockAdjustments: { select: { id: true } },
                    orders: { select: { id: true } }
                }
            });
            console.log('🎉 SUCCESS! Users count:', users.length);
            await p.$disconnect();
            break;
        } catch (e) {
            console.error('❌ Failed:', e.message);
        }
    }
}

testDirectIPs();
