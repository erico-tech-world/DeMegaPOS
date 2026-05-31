import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testUpdate() {
    try {
        console.log("=== Testing Prisma Product Update ===");
        const product = await prisma.product.findFirst();
        if (!product) {
            console.log("No product found to update.");
            return;
        }

        console.log(`Found product: ${product.name} (ID: ${product.id}, TenantID: ${product.tenantId})`);

        // Test database update directly
        const updated = await prisma.product.update({
            where: { id: product.id },
            data: {
                name: product.name + " (Updated)",
                price: product.price,
            }
        });
        console.log("Direct Prisma update succeeded:", updated.name);

        // Revert it
        await prisma.product.update({
            where: { id: product.id },
            data: { name: product.name }
        });
        console.log("Reverted Direct Prisma update successfully.");

    } catch (err) {
        console.error("Prisma update test failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testUpdate();
