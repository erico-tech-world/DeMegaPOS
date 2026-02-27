import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginSchema, registerSchema, businessRegisterSchema, authResponseSchema } from './schemas.js'
import { createUser, findUserByIdentifier, verifyPassword, registerBusiness } from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '../../lib/prisma.js'

export default async function authRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    server.post(
        '/register',
        {
            schema: {
                body: registerSchema,
                response: {
                    201: authResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const user = await createUser(request.body)
            const accessToken = app.jwt.sign({
                id: user.id,
                email: user.email,
                phone: user.phone,
                tenantId: user.tenantId,
                role: user.role,
                branchId: user.branchId
            })

            return reply.code(201).send({
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenantId,
                    branchId: user.branchId,
                    permissions: user.permissions
                },
                accessToken,
            })
        }
    )

    server.post(
        '/business-register',
        {
            schema: {
                body: businessRegisterSchema,
                response: {
                    201: authResponseSchema,
                },
            },
        },
        async (request, reply) => {
            const { tenant, user } = await registerBusiness(request.body)
            const accessToken = app.jwt.sign({
                id: user.id,
                email: user.email,
                phone: user.phone,
                tenantId: user.tenantId,
                role: user.role,
                branchId: user.branchId
            })

            return reply.code(201).send({
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenantId,
                    branchId: user.branchId,
                    permissions: user.permissions
                },
                accessToken,
            })
        }
    )

    server.post(
        '/login',
        {
            schema: {
                body: loginSchema,
                response: {
                    200: authResponseSchema,
                    401: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { identifier, password } = request.body
            const user = await findUserByIdentifier(identifier)

            if (!user) {
                return reply.code(401).send({ message: 'Invalid identifier or password' })
            }

            const isPasswordValid = await verifyPassword(password, user.password)

            if (!isPasswordValid) {
                return reply.code(401).send({ message: 'Invalid identifier or password' })
            }

            // --- Device & Session Management ---
            const userAgent = request.headers['user-agent']
            const ipAddress = request.ip

            const existingSession = await prisma.userSession.findFirst({
                where: {
                    userId: user.id,
                    userAgent,
                    ipAddress,
                }
            })

            if (!existingSession) {
                console.log(`[SECURITY] Unrecognized device login for user ${user.id} from ${ipAddress}`)
                // In a real app, send email/SMS alert here
            }

            await prisma.userSession.create({
                data: {
                    userId: user.id,
                    userAgent,
                    ipAddress,
                    isMfaVerified: existingSession ? existingSession.isMfaVerified : false
                }
            })

            const accessToken = app.jwt.sign({
                id: user.id,
                email: user.email,
                phone: user.phone,
                tenantId: user.tenantId,
                role: user.role,
                branchId: user.branchId
            })

            return reply.code(200).send({
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    name: user.name,
                    role: user.role,
                    tenantId: user.tenantId,
                    branchId: user.branchId,
                    permissions: user.permissions
                },
                accessToken,
            })
        }
    )

    server.post(
        '/forgot-password',
        {
            schema: {
                body: z.object({
                    identifier: z.string().min(1),
                }),
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
                // Return success even if user not found for security (prevent enumeration)
                return reply.code(200).send({ message: 'Recovery instructions sent if account exists' })
            }

            console.log(`[AUTH] Password recovery requested for ${identifier}`)
            // In a real app: generate token, save to DB, send Email/SMS

            return reply.code(200).send({ message: 'Recovery instructions sent if account exists' })
        }
    )
}
