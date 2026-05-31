import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { sendMail, buildStaffInviteEmail } from '../../lib/mail.js';
import { sendSms } from '../../lib/sms.js';
// ---------------------------------------------------------------------------
// Staff Invitation
// ---------------------------------------------------------------------------
export async function createStaffInvitation(data, tenantId) {
    // 1. Resolve the tenant name for the notification message
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    if (!tenant)
        throw new Error('Tenant not found');
    // 2. Generate a cryptographically-secure invitation token
    const token = crypto.randomBytes(32).toString('hex');
    // 3. Persist the invitation
    const invitation = await prisma.staffInvitation.create({
        data: {
            email: data.email,
            phone: data.phone,
            role: data.role,
            branchId: data.branchId,
            token,
            tenantId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });
    // 4. Build the accept-invite URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${frontendUrl}/auth/accept-invite?token=${token}`;
    // 5. Dispatch notification (email or SMS — whichever contact was provided)
    const roleName = data.role.replace(/_/g, ' ');
    if (data.email) {
        sendMail({
            to: data.email,
            subject: `You're invited to join ${tenant.name} on DeMegaPOS`,
            html: buildStaffInviteEmail({
                businessName: tenant.name,
                role: roleName,
                inviteUrl,
                expiresInDays: 7,
            }),
        }).then(() => {
            console.log(`[INVITE] Email sent to ${data.email}`);
        }).catch(err => {
            console.error('[INVITE] Failed to send email:', err);
        });
    }
    if (data.phone) {
        sendSms({
            to: data.phone,
            body: `You've been invited to join ${tenant.name} on DeMegaPOS as ${roleName}. Accept your invitation here: ${inviteUrl}  (expires in 7 days)`,
        }).then(() => {
            console.log(`[INVITE] SMS sent to ${data.phone}`);
        }).catch(err => {
            console.error('[INVITE] Failed to send SMS:', err);
        });
    }
    return invitation;
}
// ---------------------------------------------------------------------------
// Accept Invitation — called by the /auth/accept-invite endpoint
// ---------------------------------------------------------------------------
export async function acceptInvitation(token, name, password) {
    const invitation = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invitation)
        throw new Error('INVALID_TOKEN');
    if (invitation.acceptedAt)
        throw new Error('ALREADY_ACCEPTED');
    if (invitation.expiresAt < new Date())
        throw new Error('TOKEN_EXPIRED');
    // Create a hashed password
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create the user account and mark the invitation as accepted in one transaction
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name,
                email: invitation.email,
                phone: invitation.phone,
                password: hashedPassword,
                role: invitation.role,
                tenantId: invitation.tenantId,
                branchId: invitation.branchId,
            },
        });
        await tx.staffInvitation.update({
            where: { id: invitation.id },
            data: { acceptedAt: new Date() },
        });
        return user;
    });
}
// ---------------------------------------------------------------------------
// Staff CRUD
// ---------------------------------------------------------------------------
export async function getStaffList(tenantId) {
    return prisma.user.findMany({
        where: { tenantId }
    });
}
export async function updatePermissions(userId, permissions) {
    return prisma.user.update({
        where: { id: userId },
        data: { permissions }
    });
}
export async function updateStaff(userId, tenantId, data) {
    return prisma.user.update({
        where: { id: userId, tenantId },
        data
    });
}
export async function deleteStaff(userId, tenantId) {
    return prisma.user.delete({
        where: { id: userId, tenantId }
    });
}
