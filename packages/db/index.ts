import 'dotenv/config'
export * from '@prisma/client'
import { PrismaClient } from '@prisma/client'
export { requestContext, getContext } from './context.js'
import { requestContext } from './context.js'

const prismaBase = new PrismaClient()

export const prisma = prismaBase.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                const context = requestContext.getStore()
                if (!context || !context.tenantId) {
                    return query(args)
                }

                const { tenantId, branchId, role } = context

                // Apply tenantId filter to all models that have it
                const tenantScopedModels = ['User', 'Product', 'Category', 'Customer', 'ActivityLog', 'StaffInvitation', 'StockAdjustment']
                if (tenantScopedModels.includes(model)) {
                    if (operation === 'create' || operation === 'createMany') {
                        // @ts-ignore
                        args.data = { ...args.data, tenantId }
                    } else {
                        // @ts-ignore
                        args.where = { ...args.where, tenantId }
                    }
                }

                // Apply storeId/branchId filter for non-owners/non-super-admins
                if (role !== 'SUPER_ADMIN' && branchId) {
                    const branchScopedModels = ['Order', 'StaffInvitation', 'User']
                    if (branchScopedModels.includes(model)) {
                        const fieldName = model === 'Order' ? 'storeId' : 'branchId'
                        if (operation === 'create' || operation === 'createMany') {
                            // @ts-ignore
                            args.data = { ...args.data, [fieldName]: branchId }
                        } else {
                            // @ts-ignore
                            args.where = { ...args.where, [fieldName]: branchId }
                        }
                    }
                }

                return query(args)
            },
        },
    },
})

export default prisma as unknown as PrismaClient
