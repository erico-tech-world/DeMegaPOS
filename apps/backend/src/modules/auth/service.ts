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
    const trimmed = identifier.trim()
    return prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: trimmed, mode: 'insensitive' } },
                { phone: trimmed },
                { staffCode: { equals: trimmed, mode: 'insensitive' } }
            ]
        },
        include: {
            tenant: true,
            branch: true
        }
    })
}

export async function findStaffUser(identifier: string, branchOrBusinessCode?: string) {
    const trimmedIdentifier = identifier.trim()
    const trimmedCode = branchOrBusinessCode?.trim()

    // 1. If branch or business code is provided, narrow down user search
    if (trimmedCode) {
        // Match either Store branchCode or Tenant businessCode / slug
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { equals: trimmedIdentifier, mode: 'insensitive' } },
                    { phone: trimmedIdentifier },
                    { staffCode: { equals: trimmedIdentifier, mode: 'insensitive' } }
                ],
                AND: [
                    {
                        OR: [
                            { branch: { branchCode: { equals: trimmedCode, mode: 'insensitive' } } },
                            { tenant: { businessCode: { equals: trimmedCode, mode: 'insensitive' } } },
                            { tenant: { slug: { equals: trimmedCode, mode: 'insensitive' } } },
                        ]
                    }
                ]
            },
            include: {
                tenant: true,
                branch: true
            }
        })
        if (users.length > 0) return users[0]
    }

    // 2. Fallback lookup by identifier directly (email, staffCode, phone)
    return prisma.user.findFirst({
        where: {
            OR: [
                { email: { equals: trimmedIdentifier, mode: 'insensitive' } },
                { phone: trimmedIdentifier },
                { staffCode: { equals: trimmedIdentifier, mode: 'insensitive' } }
            ]
        },
        include: {
            tenant: true,
            branch: true
        }
    })
}


export async function registerBusiness(data: any) {
    const hashedPassword = await hashPassword(data.password)

    // 1. Create slug (sequential, no transaction needed — PgBouncer incompatible)
    const slug = data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    let finalSlug = slug
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    if (existing) {
        finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`
    }

    // 2. Create Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: data.businessName,
            slug: finalSlug,
        }
    })

    // 3. Create Admin User linked to that tenant
    const user = await prisma.user.create({
        data: {
            email: data.email,
            phone: data.phone,
            password: hashedPassword,
            name: data.name,
            role: 'SUPER_ADMIN',
            tenantId: tenant.id,
        }
    })

    return { tenant, user }
}

