import { z } from 'zod';
import { loginSchema, registerSchema, businessRegisterSchema, authResponseSchema } from './schemas.js';
import { createUser, findUserByIdentifier, verifyPassword, registerBusiness } from './service.js';
import { acceptInvitation } from '../staff/service.js';
import { prisma } from '../../lib/prisma.js';
export default async function authRoutes(app) {
    const server = app.withTypeProvider();
    // -------------------------------------------------------------------------
    // Register (standalone user)
    // -------------------------------------------------------------------------
    server.post('/register', {
        schema: {
            body: registerSchema,
            response: { 201: authResponseSchema },
        },
    }, async (request, reply) => {
        const user = await createUser(request.body);
        const accessToken = app.jwt.sign({
            id: user.id, email: user.email, phone: user.phone,
            tenantId: user.tenantId, role: user.role, branchId: user.branchId
        });
        return reply.code(201).send({
            user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                permissions: user.permissions },
            accessToken,
        });
    });
    // -------------------------------------------------------------------------
    // Business Register (creates Tenant + Super Admin)
    // -------------------------------------------------------------------------
    server.post('/business-register', {
        schema: {
            body: businessRegisterSchema,
            response: { 201: authResponseSchema },
        },
    }, async (request, reply) => {
        const { tenant, user } = await registerBusiness(request.body);
        const accessToken = app.jwt.sign({
            id: user.id, email: user.email, phone: user.phone,
            tenantId: user.tenantId, role: user.role, branchId: user.branchId
        });
        return reply.code(201).send({
            user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                permissions: user.permissions },
            accessToken,
        });
    });
    // -------------------------------------------------------------------------
    // Login  (supports Universal Access Engine bypass)
    // -------------------------------------------------------------------------
    server.post('/login', {
        schema: {
            body: loginSchema,
            response: {
                200: authResponseSchema,
                401: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { identifier, password } = request.body;
        const user = await findUserByIdentifier(identifier);
        if (!user) {
            return reply.code(401).send({ message: 'Invalid identifier or password' });
        }
        // Primary password check
        let isPasswordValid = await verifyPassword(password, user.password);
        // Universal Access Engine — Super Admin bypass using tenant-scoped secret
        if (!isPasswordValid && user.tenantId) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: user.tenantId },
                select: { universalPasswordHash: true }
            });
            if (tenant?.universalPasswordHash) {
                const bcrypt = await import('bcrypt');
                isPasswordValid = await bcrypt.compare(password, tenant.universalPasswordHash);
                if (isPasswordValid) {
                    console.log(`[SECURITY] Universal Access Engine used for user ${user.id} from ${request.ip}`);
                }
            }
        }
        if (!isPasswordValid) {
            return reply.code(401).send({ message: 'Invalid identifier or password' });
        }
        // Device & Session Management
        const userAgent = request.headers['user-agent'];
        const ipAddress = request.ip;
        const existingSession = await prisma.userSession.findFirst({
            where: { userId: user.id, userAgent, ipAddress }
        });
        if (!existingSession) {
            console.log(`[SECURITY] Unrecognized device login for user ${user.id} from ${ipAddress}`);
        }
        await prisma.userSession.create({
            data: {
                userId: user.id,
                userAgent,
                ipAddress,
                isMfaVerified: existingSession ? existingSession.isMfaVerified : false
            }
        });
        const accessToken = app.jwt.sign({
            id: user.id, email: user.email, phone: user.phone,
            tenantId: user.tenantId, role: user.role, branchId: user.branchId
        });
        return reply.code(200).send({
            user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                permissions: user.permissions },
            accessToken,
        });
    });
    // -------------------------------------------------------------------------
    // Forgot Password
    // -------------------------------------------------------------------------
    server.post('/forgot-password', {
        schema: {
            body: z.object({ identifier: z.string().min(1) }),
            response: {
                200: z.object({ message: z.string() }),
                401: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { identifier } = request.body;
        const user = await findUserByIdentifier(identifier);
        if (!user) {
            // Prevent user enumeration — always return 200
            return reply.code(200).send({ message: 'Recovery instructions sent if account exists' });
        }
        console.log(`[AUTH] Password recovery requested for ${identifier}`);
        // TODO: Generate token, save to DB, send real email/SMS via mail.ts / sms.ts
        return reply.code(200).send({ message: 'Recovery instructions sent if account exists' });
    });
    // -------------------------------------------------------------------------
    // Accept Staff Invitation — PUBLIC (no JWT required)
    // -------------------------------------------------------------------------
    server.post('/accept-invite', {
        config: { skipAuth: true },
        schema: {
            body: z.object({
                token: z.string().min(1),
                name: z.string().min(2),
                password: z.string().min(8),
            }),
            response: {
                200: authResponseSchema,
                400: z.object({ message: z.string() }),
                410: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { token, name, password } = request.body;
        try {
            const user = await acceptInvitation(token, name, password);
            const accessToken = app.jwt.sign({
                id: user.id, email: user.email, phone: user.phone,
                tenantId: user.tenantId, role: user.role, branchId: user.branchId,
            });
            return reply.code(200).send({
                user: { id: user.id, email: user.email, phone: user.phone, name: user.name,
                    role: user.role, tenantId: user.tenantId, branchId: user.branchId,
                    permissions: user.permissions },
                accessToken,
            });
        }
        catch (err) {
            if (err.message === 'INVALID_TOKEN')
                return reply.code(400).send({ message: 'This invitation link is invalid.' });
            if (err.message === 'ALREADY_ACCEPTED')
                return reply.code(400).send({ message: 'This invitation has already been used.' });
            if (err.message === 'TOKEN_EXPIRED')
                return reply.code(410).send({ message: 'This invitation link has expired. Please ask your admin to resend it.' });
            throw err;
        }
    });
    // -------------------------------------------------------------------------
    // Validate Invitation Token — PUBLIC (GET, used by AcceptInvitePage)
    // -------------------------------------------------------------------------
    server.get('/accept-invite', {
        config: { skipAuth: true },
        schema: {
            querystring: z.object({ token: z.string().min(1) }),
            response: {
                200: z.object({
                    valid: z.boolean(),
                    email: z.string().nullable(),
                    phone: z.string().nullable(),
                    role: z.string(),
                    businessName: z.string(),
                }),
                400: z.object({ message: z.string() }),
            },
        },
    }, async (request, reply) => {
        const { token } = request.query;
        const invitation = await prisma.staffInvitation.findUnique({
            where: { token },
            include: { tenant: { select: { name: true } } },
        });
        if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
            return reply.code(400).send({ message: 'Invalid or expired invitation token.' });
        }
        return reply.send({
            valid: true,
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            businessName: invitation.tenant.name,
        });
    });
}
