import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://admin:password@localhost:5432/demegapos?schema=public"
        }
    }
})

async function main() {
    console.log('🌱 Standalone Seeding...')
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'mega-retail' },
        update: {},
        create: {
            name: 'Mega Retailers Ltd',
            slug: 'mega-retail',
        }
    })
    console.log('✅ Created/Found Tenant:', tenant.id)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
