import { prisma } from '../../lib/prisma.js'
import { CreateCategoryInput, CreateProductInput, UpdateProductInput, StockAdjustmentInput } from './schemas.js'

export async function createCategory(data: CreateCategoryInput & { tenantId: string }) {
    return prisma.category.create({
        data,
    })
}

export async function getCategories(tenantId: string) {
    return prisma.category.findMany({ where: { tenantId } })
}

export async function createProduct(data: CreateProductInput & { tenantId: string }) {
    const { variants, bundleItems, ...productData } = data

    return prisma.product.create({
        data: {
            ...productData,
            price: productData.price.toString(),
            costPrice: productData.costPrice?.toString(),
            vipPrice: productData.vipPrice?.toString(),
            unit: productData.unit,
            expiryDate: productData.expiryDate ? new Date(productData.expiryDate) : null,
            variants: variants ? {
                create: variants.map(v => ({
                    ...v,
                    price: v.price.toString(),
                    costPrice: v.costPrice?.toString(),
                    vipPrice: v.vipPrice?.toString(),
                    unit: v.unit,
                    tenantId: productData.tenantId // Ensure variants get tenantId
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
    })
}

export async function getProducts(tenantId: string) {
    return prisma.product.findMany({
        where: { tenantId },
        include: {
            category: true,
            variants: true,
            bundleItems: {
                include: {
                    componentProduct: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateProduct(id: string, tenantId: string, data: UpdateProductInput) {
    const { variants, bundleItems, ...productData } = data

    // Simplified update logic (for variants and bundles, it's better to recreate or handle individually, 
    // but for this basic CRUD we'll just update the main product fields for now)
    
    const updateData: any = { ...productData }
    if (productData.price !== undefined) updateData.price = productData.price.toString()
    if (productData.costPrice !== undefined) updateData.costPrice = productData.costPrice?.toString()
    if (productData.vipPrice !== undefined) updateData.vipPrice = productData.vipPrice?.toString()
    if (productData.expiryDate !== undefined) updateData.expiryDate = productData.expiryDate ? new Date(productData.expiryDate) : null

    return prisma.product.update({
        where: { id, tenantId },
        data: updateData,
        include: {
            category: true,
            variants: true,
            bundleItems: {
                include: { componentProduct: true }
            }
        }
    })
}

export async function deleteProduct(id: string, tenantId: string) {
    return prisma.product.delete({
        where: { id, tenantId }
    })
}

export async function createStockAdjustment(data: StockAdjustmentInput & { tenantId: string }, userId: string) {
    const { productId, variantId, type, quantity, reason } = data

    // 1. Create the adjustment log (sequential — PgBouncer Transaction Pooler incompatible with interactive tx)
    const adjustment = await prisma.stockAdjustment.create({
        data: {
            productId,
            variantId,
            type,
            quantity,
            reason,
            userId,
            tenantId: (data as any).tenantId
        }
    })

    // 2. Update stock level
    const multiplier = (type === 'IN' || type === 'RETURN') ? 1 : -1
    const netQuantity = (type === 'ADJUST') ? (quantity) : (quantity * multiplier)

    if (variantId) {
        await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                stock: (type === 'ADJUST') ? quantity : { increment: netQuantity }
            }
        })
    } else {
        await prisma.product.update({
            where: { id: productId },
            data: {
                stock: (type === 'ADJUST') ? quantity : { increment: netQuantity }
            }
        })
    }

    return adjustment
}

