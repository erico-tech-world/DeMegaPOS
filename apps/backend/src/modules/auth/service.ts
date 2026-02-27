import bcrypt from 'bcrypt'
import { prisma } from '../../lib/prisma.js'
import { RegisterInput } from './schemas.js'

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash)
}

export async function createUser(data: RegisterInput) {
    const hashedPassword = await hashPassword(data.password)
    return prisma.user.create({
        data: {
            email: data.email,
            phone: data.phone,
            password: hashedPassword,
            name: data.name,
            role: data.role as any,
            tenantId: data.tenantId,
            branchId: data.branchId,
        },
    })
}

export async function findUserByIdentifier(identifier: string) {
    return prisma.user.findFirst({
        where: {
            OR: [
                { email: identifier },
                { phone: identifier }
            ]
        },
    })
}

export async function registerBusiness(data: any) {
    const hashedPassword = await hashPassword(data.password)

    // Create Tenant and User in a transaction
    return prisma.$transaction(async (tx) => {
        // 1. Create Tenant
        const slug = data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        let finalSlug = slug;
        const existing = await tx.tenant.findUnique({ where: { slug } });
        if (existing) {
            finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
        }

        const tenant = await tx.tenant.create({
            data: {
                name: data.businessName,
                slug: finalSlug,
            }
        });

        // 2. Create Admin User
        const user = await tx.user.create({
            data: {
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                name: data.name,
                role: 'SUPER_ADMIN',
                tenantId: tenant.id,
            }
        });

        return { tenant, user };
    });
}
