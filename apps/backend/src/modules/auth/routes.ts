import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginSchema, staffLoginSchema, registerSchema, businessRegisterSchema, authResponseSchema, changePasswordSchema } from './schemas.js'
import { createUser, findUserByIdentifier, findStaffUser, verifyPassword, registerBusiness } from './service.js'

import { acceptInvitation } from '../staff/service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '../../lib/prisma.js'

export default async function authRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    function computeMultiBranchAccess(user: any): boolean {
        if (user.role === 'SUPER_ADMIN' || user.role === 'OWNER' || user.role === 'REGIONAL_MANAGER') {
            return true
        }
        if (!user.branchId) {
            return true
        }
        if (user.permissions && typeof user.permissions === 'object') {
            return (user.permissions as any).hasMultiBranchAccess === true
        }
        return false
    }

    // -------------------------------------------------------------------------
    // Register (standalone user)
    // -------------------------------------------------------------------------
    server.post(
        '/register',
        {
            schema: {
                body: registerSchema,
                response: { 201: authResponseSchema },
            },
        },
        async (request, reply) => {
            const user = await createUser(request.body)
            const hasMultiBranchAccess = computeMultiBranchAccess(user)
            const accessToken = app.jwt.sign({
                id: user.id, email: user.email, phone: user.phone,
                tenantId: user.tenantId, role: user.role, branchId: user.branchId,
                hasMultiBranchAccess
            })
            return reply.code(201).send({
                user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                        role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                        permissions: user.permissions, hasMultiBranchAccess },
                accessToken,
            })
        }
    )

    // -------------------------------------------------------------------------
    // Business Register (creates Tenant + Super Admin)
    // -------------------------------------------------------------------------
    server.post(
        '/business-register',
        {
            schema: {
                body: businessRegisterSchema,
                response: { 201: authResponseSchema },
            },
        },
        async (request, reply) => {
            const { tenant, user } = await registerBusiness(request.body)
            const hasMultiBranchAccess = computeMultiBranchAccess(user)
            const accessToken = app.jwt.sign({
                id: user.id, email: user.email, phone: user.phone,
                tenantId: user.tenantId, role: user.role, branchId: user.branchId,
                hasMultiBranchAccess
            })
            return reply.code(201).send({
                user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                        role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                        permissions: user.permissions, hasMultiBranchAccess },
                accessToken,
            })
        }
    )

    // -------------------------------------------------------------------------
    // Login — Business Owner Sign-In (Supports Universal Access Engine)
    // -------------------------------------------------------------------------
    server.post(
        '/login',
        {
            schema: {
                body: loginSchema,
                response: {
                    200: authResponseSchema,
                    401: z.object({ message: z.string() }),
                    403: z.object({
                        message: z.string(),
                        accountType: z.string().optional(),
                        identifier: z.string().optional(),
                        email: z.string().optional(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { identifier, password } = request.body
            const user = await findUserByIdentifier(identifier)

            if (!user) {
                return reply.code(401).send({ message: 'Invalid identifier or password' })
            }

            // ── Portal Role Separation Guard: Staff trying to use Owner Portal ────────
            const staffRoles = ['CASHIER', 'INVENTORY_MANAGER', 'BRANCH_MANAGER']
            if (staffRoles.includes(user.role as string)) {
                return reply.code(403).send({
                    message: 'Staff Access Restricted: Please use the Staff Terminal Sign-In tab with your Branch Code and PIN.',
                    accountType: 'STAFF_RESTRICTED',
                    identifier: user.staffCode || user.email || identifier,
                })
            }

            // Primary password check
            let isPasswordValid = await verifyPassword(password, user.password)

            // Universal Access Engine — Super Admin bypass using tenant-scoped secret
            if (!isPasswordValid && user.tenantId) {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: user.tenantId },
                    select: { universalPasswordHash: true }
                })
                if (tenant?.universalPasswordHash) {
                    const bcrypt = await import('bcrypt')
                    isPasswordValid = await bcrypt.compare(password, tenant.universalPasswordHash)
                    if (isPasswordValid) {
                        console.log(`[SECURITY] Universal Access Engine used for user ${user.id} from ${request.ip}`)
                    }
                }
            }

            if (!isPasswordValid) {
                return reply.code(401).send({ message: 'Invalid identifier or password' })
            }

            // ── Account Status Guard — enforces instant revocation ──────────────
            if (!user.isActive || user.status === 'TERMINATED' || user.status === 'SUSPENDED') {
                return reply.code(403).send({ message: 'Access Revoked: Your account has been suspended or terminated. Please contact your administrator.' })
            }

            // Device & Session Management
            const userAgent = request.headers['user-agent']
            const ipAddress = request.ip

            const existingSession = await prisma.userSession.findFirst({
                where: { userId: user.id, userAgent, ipAddress }
            })

            if (!existingSession) {
                console.log(`[SECURITY] Unrecognized device login for user ${user.id} from ${ipAddress}`)
            }

            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    userAgent,
                    ipAddress,
                    isMfaVerified: existingSession ? existingSession.isMfaVerified : false
                }
            })

            const hasMultiBranchAccess = computeMultiBranchAccess(user)
            const accessToken = app.jwt.sign({
                id: user.id, email: user.email, phone: user.phone,
                tenantId: user.tenantId, role: user.role, branchId: user.branchId,
                hasMultiBranchAccess
            })

            return reply.code(200).send({
                user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                        role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                        permissions: user.permissions, hasMultiBranchAccess },
                accessToken,
            })
        }
    )

    // -------------------------------------------------------------------------
    // Staff Login — Staff Terminal Sign-In (Password + 4–6 Digit PIN Enforcement)
    // -------------------------------------------------------------------------
    server.post(
        '/staff-login',
        {
            schema: {
                body: staffLoginSchema,
                response: {
                    200: authResponseSchema,
                    401: z.object({ message: z.string() }),
                    403: z.object({
                        message: z.string(),
                        accountType: z.string().optional(),
                        email: z.string().optional(),
                        identifier: z.string().optional(),
                    }),
                },
            },
        },
        async (request, reply) => {
            const { branchOrBusinessCode, identifier, password, pin } = request.body
            const user = await findStaffUser(identifier, branchOrBusinessCode)

            if (!user) {
                return reply.code(401).send({ message: 'Invalid Staff Code, Email, or Branch credentials.' })
            }

            // ── Portal Role Separation Guard: Super Admin / Owner attempting Staff Sign-In
            if (user.role === 'SUPER_ADMIN' || (user.role as string) === 'OWNER') {
                return reply.code(403).send({
                    message: 'Super Admin / Owner account detected. Please sign in via the Business Owner portal.',
                    accountType: 'OWNER_REQUIRED',
                    email: user.email || identifier,
                })
            }

            // 1. Verify Staff Account Password
            const isPasswordValid = await verifyPassword(password, user.password)
            if (!isPasswordValid) {
                return reply.code(401).send({ message: 'Invalid staff account password.' })
            }

            // 2. Verify 4–6 Digit POS Terminal PIN
            if (user.pin) {
                const bcrypt = await import('bcrypt')
                const isPinValid = await bcrypt.compare(pin.trim(), user.pin)
                if (!isPinValid) {
                    return reply.code(401).send({ message: 'Invalid 4–6 digit POS Terminal PIN.' })
                }
            }

            // ── Account Status Guard ───────────────────────────────────────────
            if (!user.isActive || user.status === 'TERMINATED' || user.status === 'SUSPENDED') {
                return reply.code(403).send({ message: 'Access Revoked: Your staff account has been suspended or terminated. Please contact your administrator.' })
            }

            // Device & Session Management
            const userAgent = request.headers['user-agent']
            const ipAddress = request.ip

            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    userAgent,
                    ipAddress,
                    isMfaVerified: false
                }
            })

            const hasMultiBranchAccess = computeMultiBranchAccess(user)
            const accessToken = app.jwt.sign({
                id: user.id, email: user.email, phone: user.phone,
                tenantId: user.tenantId, role: user.role, branchId: user.branchId,
                hasMultiBranchAccess
            })

            return reply.code(200).send({
                user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                        role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                        permissions: user.permissions, hasMultiBranchAccess },
                accessToken,
            })
        }
    )


    // -------------------------------------------------------------------------
    // Forgot Password
    // -------------------------------------------------------------------------
    server.post(
        '/forgot-password',
        {
            schema: {
                body: z.object({ identifier: z.string().min(1) }),
                response: {
                    200: z.object({ message: z.string() }),
                    401: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { identifier } = request.body
            const user = await findUserByIdentifier(identifier)
            if (!user) {
                // Prevent user enumeration — always return 200
                return reply.code(200).send({ message: 'Recovery instructions sent if account exists' })
            }
            console.log(`[AUTH] Password recovery requested for ${identifier}`)
            // TODO: Generate token, save to DB, send real email/SMS via mail.ts / sms.ts
            return reply.code(200).send({ message: 'Recovery instructions sent if account exists' })
        }
    )

    // -------------------------------------------------------------------------
    // Accept Staff Invitation — PUBLIC (no JWT required)
    // -------------------------------------------------------------------------
    server.post(
        '/accept-invite',
        {
            config: { skipAuth: true },
            schema: {
                body: z.object({
                    token:    z.string().min(1),
                    name:     z.string().min(2),
                    password: z.string().min(8),
                    pin:      z.string().min(4).max(6).optional(),
                }),
                response: {
                    200: authResponseSchema,
                    400: z.object({ message: z.string() }),
                    410: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { token, name, password, pin } = request.body
            try {
                const user = await acceptInvitation(token, name, password, pin)
                const hasMultiBranchAccess = computeMultiBranchAccess(user)
                const accessToken = app.jwt.sign({
                    id: user.id, email: user.email, phone: user.phone,
                    tenantId: user.tenantId, role: user.role, branchId: user.branchId,
                    hasMultiBranchAccess
                })
                return reply.code(200).send({
                    user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                            role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                            permissions: user.permissions, hasMultiBranchAccess },
                    accessToken,
                })
            } catch (err: any) {
                if (err.message === 'INVALID_TOKEN')   return reply.code(400).send({ message: 'This invitation link is invalid.' })
                if (err.message === 'ALREADY_ACCEPTED') return reply.code(400).send({ message: 'This invitation has already been used.' })
                if (err.message === 'TOKEN_EXPIRED')   return reply.code(410).send({ message: 'This invitation link has expired. Please ask your admin to resend it.' })
                throw err
            }
        }
    )

    // -------------------------------------------------------------------------
    // Validate Invitation Token — PUBLIC (GET, used by AcceptInvitePage)
    // -------------------------------------------------------------------------
    server.get(
        '/accept-invite',
        {
            config: { skipAuth: true },
            schema: {
                querystring: z.object({ token: z.string().min(1) }),
                response: {
                    200: z.object({
                        valid:        z.boolean(),
                        email:        z.string().nullable(),
                        phone:        z.string().nullable(),
                        role:         z.string(),
                        businessName: z.string(),
                    }),
                    400: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { token } = request.query as { token: string }
            const invitation = await prisma.staffInvitation.findUnique({
                where:   { token },
                include: { tenant: { select: { name: true } } },
            })

            if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
                return reply.code(400).send({ message: 'Invalid or expired invitation token.' })
            }

            return reply.send({
                valid:        true,
                email:        invitation.email,
                phone:        invitation.phone,
                role:         invitation.role,
                businessName: invitation.tenant.name,
            })
        }
    )

    // -------------------------------------------------------------------------
    // Update User Theme Preference (PATCH /auth/theme)
    // -------------------------------------------------------------------------
    server.patch(
        '/theme',
        {
            onRequest: [async (request, reply) => {
                try {
                    await request.jwtVerify()
                } catch {
                    return reply.code(401).send({ message: 'Authentication required.' })
                }
            }],
            schema: {
                body: z.object({
                    themePreference: z.enum(['light', 'dark']),
                }),
                response: {
                    200: z.object({ message: z.string(), themePreference: z.string() }),
                    401: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const userId = (request.user as any)?.id
            if (!userId) {
                return reply.code(401).send({ message: 'Unauthorized' })
            }
            const { themePreference } = request.body
            try {
                await (prisma as any).user.update({
                    where: { id: userId },
                    data: { themePreference }
                })
            } catch {
                // Ignore if field doesn't exist yet in DB schema
            }
            return reply.send({ message: 'Theme updated successfully', themePreference })
        }
    )

    // -------------------------------------------------------------------------
    // Change User Password (PATCH /auth/change-password)
    // -------------------------------------------------------------------------
    server.patch(
        '/change-password',
        {
            onRequest: [async (request, reply) => {
                try {
                    await request.jwtVerify()
                } catch {
                    return reply.code(401).send({ message: 'Authentication required. Please sign in again.' })
                }
            }],
            schema: {
                body: changePasswordSchema,
                response: {
                    200: z.object({ message: z.string() }),
                    400: z.object({ message: z.string() }),
                    401: z.object({ message: z.string() }),
                    404: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const userId = (request.user as any)?.id
            if (!userId) {
                return reply.code(401).send({ message: 'Authentication required. Please sign in again.' })
            }

            const { currentPassword, newPassword } = request.body

            const user = await prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                return reply.code(404).send({ message: 'User account not found.' })
            }

            // Verify current password
            const isPasswordValid = await verifyPassword(currentPassword, user.password)
            if (!isPasswordValid) {
                return reply.code(401).send({ message: 'Current password is incorrect.' })
            }

            if (currentPassword === newPassword) {
                return reply.code(400).send({ message: 'New password must be different from your current password.' })
            }

            // Hash and update password
            const bcrypt = await import('bcrypt')
            const hashedPassword = await bcrypt.hash(newPassword, 12)

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            })

            console.log(`[SECURITY] User ${user.id} (${user.email || user.phone}) successfully changed account password.`)
            return reply.code(200).send({ message: 'Account password changed successfully.' })
        }
    )
}

