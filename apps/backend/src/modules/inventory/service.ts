import { prisma } from '../../lib/prisma.js'
import { CreateCategoryInput, CreateProductInput, UpdateProductInput, StockAdjustmentInput } from './schemas.js'

export async function createCategory(data: CreateCategoryInput & { tenantId: string; description?: string | null }) {
    return prisma.category.create({
        data: data as any,
    })
}

export async function getCategories(tenantId: string) {
    const categories = await prisma.category.findMany({
        where: { tenantId },
        include: {
            _count: {
                select: { products: true }
            }
        },
        orderBy: { name: 'asc' }
    })
    return categories.map(c => ({
        id: c.id,
        name: c.name,
        description: (c as any).description || null,
        productCount: c._count.products
    }))
}

export async function updateCategory(id: string, tenantId: string, data: { name?: string; description?: string | null }) {
    return prisma.category.update({
        where: { id, tenantId },
        data: data as any,
    })
}

export async function transferCategoryItems(tenantId: string, productIds: string[], targetCategoryId: string) {
    return prisma.product.updateMany({
        where: { id: { in: productIds }, tenantId },
        data: { categoryId: targetCategoryId }
    })
}

export async function deleteCategory(id: string, tenantId: string, reassignToCategoryId?: string) {
    const count = await prisma.product.count({ where: { categoryId: id, tenantId } })

    if (count > 0) {
        let fallbackId = reassignToCategoryId
        if (!fallbackId) {
            // Find or create 'Uncategorized' system category for this tenant
            let uncategorized = await prisma.category.findFirst({
                where: { name: 'Uncategorized', tenantId }
            })
            if (!uncategorized) {
                uncategorized = await prisma.category.create({
                    data: { name: 'Uncategorized', tenantId }
                })
            }
            fallbackId = uncategorized.id
        }

        // Reassign items to fallback category
        await prisma.product.updateMany({
            where: { categoryId: id, tenantId },
            data: { categoryId: fallbackId }
        })
    }

    return prisma.category.delete({
        where: { id, tenantId }
    })
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

export async function getProducts(tenantId: string, storeId?: string) {
    const products = await prisma.product.findMany({
        where: { tenantId },
        include: {
            category: true,
            variants: true,
            bundleItems: {
                include: {
                    componentProduct: true
                }
            },
            branchInventories: storeId ? {
                where: { storeId }
            } : true
        },
        orderBy: { createdAt: 'desc' }
    })

    return products.map(p => {
        const bi = storeId && p.branchInventories ? p.branchInventories.find(b => b.storeId === storeId) : null
        return {
            ...p,
            branchStock: bi ? bi.stock : (storeId ? 0 : null),
            isActiveAtBranch: bi ? bi.isActive : true,
        }
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
    const { productId, variantId, storeId, type, quantity, reason } = data

    // 1. Create the adjustment log (sequential — PgBouncer Transaction Pooler incompatible with interactive tx)
    const adjustment = await prisma.stockAdjustment.create({
        data: {
            productId,
            variantId,
            storeId: storeId || null,
            type,
            quantity,
            reason,
            userId,
            tenantId: (data as any).tenantId
        }
    })

    // 2. Update global stock level
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

    // 3. If storeId is provided, also upsert BranchInventory for this branch
    if (storeId) {
        const existingBi = await prisma.branchInventory.findUnique({
            where: {
                productId_storeId: {
                    productId,
                    storeId
                }
            }
        })

        if (existingBi) {
            await prisma.branchInventory.update({
                where: { id: existingBi.id },
                data: {
                    stock: (type === 'ADJUST') ? quantity : Math.max(0, existingBi.stock + netQuantity)
                }
            })
        } else {
            const initialStock = (type === 'ADJUST') ? quantity : Math.max(0, netQuantity)
            await prisma.branchInventory.create({
                data: {
                    productId,
                    storeId,
                    stock: initialStock,
                    isActive: true
                }
            })
        }
    }

    return adjustment
}

export async function setBranchProductActive(productId: string, storeId: string, isActive: boolean, tenantId: string) {
    const product = await prisma.product.findFirst({
        where: { id: productId, tenantId }
    })
    if (!product) throw new Error('Product not found for this tenant.')

    const store = await prisma.store.findFirst({
        where: { id: storeId, tenantId }
    })
    if (!store) throw new Error('Branch not found for this tenant.')

    return prisma.branchInventory.upsert({
        where: {
            productId_storeId: {
                productId,
                storeId
            }
        },
        update: {
            isActive
        },
        create: {
            productId,
            storeId,
            stock: product.stock,
            isActive
        }
    })
}

