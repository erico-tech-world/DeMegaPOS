import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
    try {
        console.log("=== Testing Customer Deletion ===");
        const customer = await prisma.customer.findFirst({
            include: { _count: { select: { orders: true, creditSales: true } } }
        });
        if (customer) {
            console.log(`Found Customer: ${customer.name} (ID: ${customer.id}) with ${customer._count.orders} orders and ${customer._count.creditSales} credit sales.`);
            try {
                // Try deleting using a transaction with rollback to avoid actually deleting if successful
                await prisma.$transaction(async (tx) => {
                    await tx.customer.delete({ where: { id: customer.id } });
                    console.log("Success! Customer can be deleted without relational constraint violations.");
                    throw new Error("ROLLBACK"); // Rollback the transaction
                });
            } catch (err) {
                if (err.message === "ROLLBACK") {
                    console.log("Customer deletion verification complete (rolled back successfully).");
                } else {
                    console.error("Customer deletion failed with error:");
                    console.error(err);
                }
            }
        } else {
            console.log("No customers found.");
        }

        console.log("\n=== Testing Product Deletion ===");
        const product = await prisma.product.findFirst({
            include: { _count: { select: { orderItems: true, stockAdjustments: true } } }
        });
        if (product) {
            console.log(`Found Product: ${product.name} (ID: ${product.id}) with ${product._count.orderItems} order items and ${product._count.stockAdjustments} stock adjustments.`);
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.product.delete({ where: { id: product.id } });
                    console.log("Success! Product can be deleted without relational constraint violations.");
                    throw new Error("ROLLBACK");
                });
            } catch (err) {
                if (err.message === "ROLLBACK") {
                    console.log("Product deletion verification complete (rolled back successfully).");
                } else {
                    console.error("Product deletion failed with error:");
                    console.error(err);
                }
            }
        } else {
            console.log("No products found.");
        }

        console.log("\n=== Testing Staff Deletion ===");
        const user = await prisma.user.findFirst({
            where: { role: { not: 'SUPER_ADMIN' } },
            include: { _count: { select: { orders: true, stockAdjustments: true } } }
        });
        if (user) {
            console.log(`Found Staff: ${user.name} (ID: ${user.id}, Role: ${user.role}) with ${user._count.orders} orders and ${user._count.stockAdjustments} stock adjustments.`);
            try {
                await prisma.$transaction(async (tx) => {
                    await tx.user.delete({ where: { id: user.id } });
                    console.log("Success! Staff can be deleted without relational constraint violations.");
                    throw new Error("ROLLBACK");
                });
            } catch (err) {
                if (err.message === "ROLLBACK") {
                    console.log("Staff deletion verification complete (rolled back successfully).");
                } else {
                    console.error("Staff deletion failed with error:");
                    console.error(err);
                }
            }
        } else {
            console.log("No non-admin staff found.");
        }

    } catch (err) {
        console.error("Diagnostic execution error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

test();
