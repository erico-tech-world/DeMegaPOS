import { PrismaClient } from '@demegapos/db';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking for admin user...");
    const email = 'admin@demega.com';
    const password = 'password123';
    
    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (user) {
        console.log("User exists, updating password to ensure it matches...");
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        console.log("Password updated.");
    } else {
        console.log("User does not exist, creating...");
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Find or create a tenant first
        let tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: 'DeMega',
                    slug: 'demega'
                }
            });
        }
        
        user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Admin',
                role: 'SUPER_ADMIN',
                tenantId: tenant.id
            }
        });
        console.log("Admin user created.");
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
