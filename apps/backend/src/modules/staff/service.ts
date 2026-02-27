import { prisma } from '../../lib/prisma.js'
import { inviteStaffSchema } from './schemas.js'
import { z } from 'zod'

export async function createStaffInvitation(data: z.infer<typeof inviteStaffSchema>, tenantId: string) {
    return prisma.staffInvitation.create({
        data: {
            email: data.email,
            phone: data.phone,
            role: data.role as any,
            branchId: data.branchId,
            token: Math.random().toString(36).substring(7), // Basic token for now
            tenantId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
    })
}

export async function getStaffList(tenantId: string) {
    return prisma.user.findMany({
        where: { tenantId }
    })
}

export async function updatePermissions(userId: string, permissions: any) {
    return prisma.user.update({
        where: { id: userId },
        data: { permissions }
    })
}
