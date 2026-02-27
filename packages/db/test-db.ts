import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    console.log('Test seeding...')
    const tenantCount = await prisma.tenant.count()
    console.log(`Current tenants: ${tenantCount}`)
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
