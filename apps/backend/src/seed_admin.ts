import { PrismaClient } from '@demegapos/db';
import bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log("Checking environment variables for admin seeding...");
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
    const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();

    if (!email || !password) {
        throw new Error(
            "[SECURITY ALERT] Admin seed aborted: Missing INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD in environment variables. " +
            "Please provide INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (minimum 8 characters) before executing seeding."
        );
    }

    if (password.length < 8) {
        throw new Error("[SECURITY ALERT] INITIAL_ADMIN_PASSWORD must be at least 8 characters long.");
    }

    console.log(`Checking for admin user: ${email}...`);
    
    let user = await prisma.user.findUnique({
        where: { email }
    });

    if (user) {
        console.log("User exists, updating password to match environment setting...");
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
