import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.count()
  const products = await prisma.product.count()
  const customers = await prisma.customer.count()
  const staff = await prisma.staff.count()
  
  console.log({
    orders,
    products,
    customers,
    staff
  })

  if (orders > 0) {
    const lastOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, cashier: true }
    })
    console.log('Last 5 orders:', JSON.stringify(lastOrders, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
