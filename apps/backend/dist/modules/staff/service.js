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
    // 4. Build the accept-invite URL — dynamic resolution (no hardcoded localhost)
    const baseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${token}`;
    // 5. Dispatch notification (email or SMS — whichever contact was provided)
    const roleName = data.role.replace(/_/g, ' ');
    let emailSent = false;
    let smsSent = false;
    if (data.email) {
        try {
            await sendMail({
                to: data.email,
                subject: `You're invited to join ${tenant.name} on DeMegaPOS`,
                html: buildStaffInviteEmail({
                    businessName: tenant.name,
                    role: roleName,
                    inviteUrl,
                    expiresInDays: 7,
                }),
            });
            console.log(`[INVITE] Email successfully sent to ${data.email}`);
            emailSent = true;
        }
        catch (err) {
            console.error('[INVITE] Failed to send email:', err.message || err);
        }
    }
    if (data.phone) {
        try {
            await sendSms({
                to: data.phone,
                body: `You've been invited to join ${tenant.name} on DeMegaPOS as ${roleName}. Accept your invitation here: ${inviteUrl}  (expires in 7 days)`,
            });
            console.log(`[INVITE] SMS successfully sent to ${data.phone}`);
            smsSent = true;
        }
        catch (err) {
            console.error('[INVITE] Failed to send SMS:', err.message || err);
        }
    }
    return {
        ...invitation,
        emailSent,
        smsSent
    };
}
// ---------------------------------------------------------------------------
// Accept Invitation — called by the /auth/accept-invite endpoint
// ---------------------------------------------------------------------------
export async function acceptInvitation(token, name, password, pin) {
    const invitation = await prisma.staffInvitation.findUnique({ where: { token } });
    if (!invitation)
        throw new Error('INVALID_TOKEN');
    if (invitation.acceptedAt)
        throw new Error('ALREADY_ACCEPTED');
    if (invitation.expiresAt < new Date())
        throw new Error('TOKEN_EXPIRED');
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    // Generate unique staffCode: EMP-YYYY-NNN
    const year = new Date().getFullYear();
    const countThisYear = await prisma.user.count({
        where: { staffCode: { startsWith: `EMP-${year}-` } }
    });
    const staffCode = `EMP-${year}-${String(countThisYear + 1).padStart(3, '0')}`;
    let hashedPin;
    if (pin) {
        if (pin.length < 4 || pin.length > 6)
            throw new Error('PIN must be 4–6 digits');
        hashedPin = await bcrypt.hash(pin, 10);
    }
    // Create the user account and mark the invitation as accepted
    const user = await prisma.user.create({
        data: {
            name,
            email: invitation.email,
            phone: invitation.phone,
            password: hashedPassword,
            role: invitation.role,
            tenantId: invitation.tenantId,
            branchId: invitation.branchId,
            staffCode,
            pin: hashedPin,
            status: 'ACTIVE',
            isActive: true,
            onboardedAt: new Date(),
        },
    });
    await prisma.staffInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
    });
    return user;
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
export async function updateStaffStatus(userId, tenantId, status, reason) {
    const now = new Date();
    return prisma.user.update({
        where: { id: userId, tenantId },
        data: {
            status,
            isActive: false,
            terminationReason: reason,
            terminatedAt: now,
        },
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
