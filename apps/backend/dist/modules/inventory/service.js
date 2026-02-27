import { prisma } from '../../lib/prisma.js';
export async function createCategory(data) {
    return prisma.category.create({
        data,
    });
}
export async function getCategories() {
    return prisma.category.findMany();
}
export async function createProduct(data) {
    const { variants, bundleItems, ...productData } = data;
    return prisma.product.create({
        data: {
            ...productData,
            price: productData.price.toString(),
            costPrice: productData.costPrice?.toString(),
            vipPrice: productData.vipPrice?.toString(),
            expiryDate: productData.expiryDate ? new Date(productData.expiryDate) : null,
            variants: variants ? {
                create: variants.map(v => ({
                    ...v,
                    price: v.price.toString(),
                    costPrice: v.costPrice?.toString(),
                    vipPrice: v.vipPrice?.toString()
                }))
            } : undefined,
            bundleItems: bundleItems ? {
                create: bundleItems.map(b => ({
                    componentProductId: b.componentProductId,
                    quantity: b.quantity
                }))
            } : undefined
        },
        include: {
            variants: true,
            bundleItems: {
                include: {
                    componentProduct: true
                }
            },
            category: true
        }
    });
}
export async function getProducts() {
    return prisma.product.findMany({
        include: {
            category: true,
            variants: true,
            bundleItems: {
                include: {
                    componentProduct: true
                }
            }
        },
    });
}
export async function createStockAdjustment(data, userId) {
    const { productId, variantId, type, quantity, reason } = data;
    return prisma.$transaction(async (tx) => {
        // 1. Create the adjustment log
        const adjustment = await tx.stockAdjustment.create({
            data: {
                productId,
                variantId,
                type,
                quantity,
                reason,
                userId,
            }
        });
        // 2. Update stock level
        const multiplier = (type === 'IN' || type === 'RETURN') ? 1 : -1;
        const netQuantity = (type === 'ADJUST') ? (quantity) : (quantity * multiplier);
        if (variantId) {
            await tx.productVariant.update({
                where: { id: variantId },
                data: {
                    stock: (type === 'ADJUST') ? quantity : { increment: netQuantity }
                }
            });
        }
        else {
            await tx.product.update({
                where: { id: productId },
                data: {
                    stock: (type === 'ADJUST') ? quantity : { increment: netQuantity }
                }
            });
        }
        return adjustment;
    });
}
