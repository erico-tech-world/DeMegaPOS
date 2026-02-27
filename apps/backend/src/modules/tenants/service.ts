import { prisma } from '../../lib/prisma.js'
import { CreateTenantInput } from './schemas.js'

export async function createTenant(data: CreateTenantInput) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Check if slug already exists, if so append unique string
    let finalSlug = slug;
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
        finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    return prisma.tenant.create({
        data: {
            name: data.name,
            slug: finalSlug,
            domain: data.domain,
            settings: data.settings || {},
        },
    })
}

export async function getTenants() {
    return prisma.tenant.findMany()
}

export async function getTenantById(id: string) {
    return prisma.tenant.findUnique({
        where: { id },
        include: {
            stores: true,
        },
    })
}
