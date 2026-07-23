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

    // 4. Build the accept-invite URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const inviteUrl   = `${frontendUrl}/auth/accept-invite?token=${token}`

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

export async function acceptInvitation(token: string, name: string, password: string) {
    const invitation = await prisma.staffInvitation.findUnique({ where: { token } })

    if (!invitation) throw new Error('INVALID_TOKEN')
    if (invitation.acceptedAt) throw new Error('ALREADY_ACCEPTED')
    if (invitation.expiresAt < new Date()) throw new Error('TOKEN_EXPIRED')

    // Create a hashed password
    const bcrypt = await import('bcrypt')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user account and mark the invitation as accepted (sequential — PgBouncer incompatible with interactive tx)
    const user = await prisma.user.create({
        data: {
            name,
            email:    invitation.email,
            phone:    invitation.phone,
            password: hashedPassword,
            role:     invitation.role,
            tenantId: invitation.tenantId,
            branchId: invitation.branchId,
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
