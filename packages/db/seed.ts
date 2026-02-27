import 'dotenv/config'
import { prisma } from './index'
import bcrypt from 'bcryptjs'

async function main() {
    console.log('🌱 Seeding database...')

    // 1. Create or Update Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'mega-retail' },
        update: {},
        create: {
            name: 'Mega Retailers Ltd',
            slug: 'mega-retail',
        }
    })

    console.log(`✅ Tenant: ${tenant.name}`)

    // 2. Create Store if not exists
    const existingStore = await prisma.store.findFirst({ where: { tenantId: tenant.id } })
    let store = existingStore
    if (!existingStore) {
        store = await prisma.store.create({
            data: {
                name: 'Main Branch - Lagos',
                tenantId: tenant.id,
            }
        })
        console.log(`✅ Store: ${store.name}`)
    } else {
        console.log(`ℹ️ Store already exists: ${store.name}`)
    }


    // 3. Create User if not exists
    const email = 'admin@demega.com'
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser) {
        const hashedPassword = await bcrypt.hash('password123', 10)
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Admin User',
                role: 'OWNER',
                tenantId: tenant.id,
            }
        })
        console.log(`✅ User: ${email}`)
    } else {
        console.log(`ℹ️ User already exists: ${email}`)
    }

    // 4. Create Category if not exists
    const categoryName = 'General Inventory'
    let category = await prisma.category.findFirst({
        where: { name: categoryName, tenantId: tenant.id }
    })

    if (!category) {
        category = await prisma.category.create({
            data: {
                name: categoryName,
                tenantId: tenant.id,
            }
        })
        console.log(`✅ Category: ${category.name}`)
    }

    // 5. Create Customer for testing
    const customer = await prisma.customer.upsert({
        where: { id: 'test-customer-1' },
        create: {
            id: 'test-customer-1',
            name: 'Regular Customer',
            phone: '08012345678',
            tenantId: tenant.id
        },
        update: {}
    })
    console.log(`✅ Customer: ${customer.name}`)

    // 6. Create Products (Standard, Variant, Bundled)
    const products = [
        {
            name: 'Premium Espresso Beans',
            price: 12500,
            stock: 45,
            sku: 'COF-001',
            type: 'STANDARD',
            categoryId: category.id,
            tenantId: tenant.id,
        },
        {
            name: 'Whole Milk 1L (Variant)',
            price: 1200,
            stock: 12,
            sku: 'DAI-022',
            type: 'VARIANT',
            categoryId: category.id,
            tenantId: tenant.id,
        },
        {
            name: 'Breakfast Combo Pack (Bundled)',
            price: 5500,
            stock: 20,
            sku: 'BUN-005',
            type: 'BUNDLED',
            categoryId: category.id,
            tenantId: tenant.id,
        }
    ]

    for (const p of products) {
        await prisma.product.upsert({
            where: { sku_tenantId: { sku: p.sku!, tenantId: tenant.id } },
            update: p as any,
            create: p as any,
        })
        console.log(`✅ Product: ${p.sku}`)
    }

    // 7. Create a Credit Sale for testing
    const order = await prisma.order.create({
        data: {
            storeId: store!.id,
            customerId: customer.id,
            totalAmount: 5500,
            paymentMethod: 'CASH',
            status: 'COMPLETED',
            paymentStatus: 'PENDING',
            creditSale: {
                create: {
                    customerId: customer.id,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                }
            }
        }
    })
    console.log(`✅ Credit Sale Order Created: ${order.id}`)

    console.log('✅ Seeding complete!')
    console.log('------------------')
    console.log(`Tenant Slug: ${tenant.slug}`)
    console.log(`Admin Login: admin@demega.com / password123`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
