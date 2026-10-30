import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { inviteStaffSchema } from './schemas.js'
import { z } from 'zod'
import { sendMail, buildStaffInviteEmail } from '../../lib/mail.js'
import { sendSms } from '../../lib/sms.js'

// ---------------------------------------------------------------------------
// Staff Invitation
// ---------------------------------------------------------------------------

export async function createStaffInvitation(
    data: z.infer<typeof inviteStaffSchema>,
    tenantId: string
) {
    // 1. Resolve the tenant name for the notification message
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    if (!tenant) throw new Error('Tenant not found')

    // 2. Generate a cryptographically-secure invitation token
    const token = crypto.randomBytes(32).toString('hex')

    // 3. Persist the invitation
    const invitation = await prisma.staffInvitation.create({
        data: {
            email:     data.email,
            phone:     data.phone,
            role:      data.role as any,
            branchId:  data.branchId,
            token,
            tenantId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    })

    // 4. Build the accept-invite URL — dynamic resolution (no hardcoded localhost)
    const baseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173'
    const inviteUrl   = `${baseUrl}/auth/accept-invite?token=${token}`

    // 5. Dispatch notification (email or SMS — whichever contact was provided)
    const roleName = (data.role as string).replace(/_/g, ' ')
    let emailSent = false
    let smsSent = false

    if (data.email) {
        try {
            await sendMail({
                to:      data.email,
                subject: `You're invited to join ${tenant.name} on DeMegaPOS`,
                html:    buildStaffInviteEmail({
                    businessName:  tenant.name,
                    role:          roleName,
                    inviteUrl,
                    expiresInDays: 7,
                }),
            })
            console.log(`[INVITE] Email successfully sent to ${data.email}`)
            emailSent = true
        } catch (err: any) {
            console.error('[INVITE] Failed to send email:', err.message || err)
        }
    }

    if (data.phone) {
        try {
            await sendSms({
                to:   data.phone,
                body: `You've been invited to join ${tenant.name} on DeMegaPOS as ${roleName}. Accept your invitation here: ${inviteUrl}  (expires in 7 days)`,
            })
            console.log(`[INVITE] SMS successfully sent to ${data.phone}`)
            smsSent = true
        } catch (err: any) {
            console.error('[INVITE] Failed to send SMS:', err.message || err)
        }
    }

    return {
        ...invitation,
        emailSent,
        smsSent
    }
}

// ---------------------------------------------------------------------------
// Accept Invitation — called by the /auth/accept-invite endpoint
// ---------------------------------------------------------------------------

export async function acceptInvitation(token: string, name: string, password: string, pin?: string) {
    const invitation = await prisma.staffInvitation.findUnique({ where: { token } })

    if (!invitation) throw new Error('INVALID_TOKEN')
    if (invitation.acceptedAt) throw new Error('ALREADY_ACCEPTED')
    if (invitation.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED')

    const bcrypt = await import('bcrypt')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate unique staffCode: EMP-YYYY-NNN
    const year = new Date().getFullYear()
    const countThisYear = await prisma.user.count({
        where: { staffCode: { startsWith: `EMP-${year}-` } }
    })
    const staffCode = `EMP-${year}-${String(countThisYear + 1).padStart(3, '0')}`

    let hashedPin: string | undefined
    if (pin) {
        const cleanPin = pin.trim()
        if (!/^[0-9]{4,6}$/.test(cleanPin)) throw new Error('PIN must be 4–6 digits')
        hashedPin = await bcrypt.hash(cleanPin, 10)
    }


    // Create the user account and mark the invitation as accepted
    const user = await prisma.user.create({
        data: {
            name,
            email:       invitation.email,
            phone:       invitation.phone,
            password:    hashedPassword,
            role:        invitation.role,
            tenantId:    invitation.tenantId,
            branchId:    invitation.branchId,
            staffCode,
            pin:         hashedPin,
            status:      'ACTIVE',
            isActive:    true,
            onboardedAt: new Date(),
        },
    })

    await prisma.staffInvitation.update({
        where: { id: invitation.id },
        data:  { acceptedAt: new Date() },
    })

    return user
}

// ---------------------------------------------------------------------------
// Staff CRUD
// ---------------------------------------------------------------------------

export interface GetStaffFilters {
    search?: string
    role?: string
    status?: string
    branchId?: string
}

export async function getStaffList(tenantId: string, filters?: GetStaffFilters) {
    const whereClause: any = { tenantId }

    if (filters?.role && filters.role !== 'ALL') {
        whereClause.role = filters.role
    }

    if (filters?.status && filters.status !== 'ALL') {
        whereClause.status = filters.status
    }

    if (filters?.branchId) {
        if (filters.branchId === 'OMNI') {
            whereClause.branchId = null
        } else if (filters.branchId !== 'ALL') {
            whereClause.branchId = filters.branchId
        }
    }

    if (filters?.search && filters.search.trim()) {
        const q = filters.search.trim()
        whereClause.OR = [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { staffCode: { contains: q, mode: 'insensitive' } },
            { id: { contains: q, mode: 'insensitive' } },
            { branch: { name: { contains: q, mode: 'insensitive' } } },
            { branch: { branchCode: { contains: q, mode: 'insensitive' } } }
        ]
    }

    return prisma.user.findMany({
        where: whereClause,
        include: {
            branch: true
        },
        orderBy: { name: 'asc' }
    })
}

export async function updatePermissions(userId: string, permissions: any) {
    return prisma.user.update({
        where: { id: userId },
        data: { permissions }
    })
}

export async function updateStaffStatus(
    userId: string,
    tenantId: string,
    status: 'SUSPENDED' | 'TERMINATED',
    reason?: string
) {
    const now = new Date()
    return prisma.user.update({
        where:  { id: userId, tenantId },
        data: {
            status,
            isActive:         false,
            terminationReason: reason,
            terminatedAt:     now,
        },
    })
}

export async function updateStaff(userId: string, tenantId: string, data: any) {
    return prisma.user.update({
        where: { id: userId, tenantId },
        data
    })
}

export async function deleteStaff(userId: string, tenantId: string) {
    return prisma.user.delete({
        where: { id: userId, tenantId }
    })
}
