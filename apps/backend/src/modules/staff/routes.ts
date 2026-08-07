import { FastifyInstance } from 'fastify'
import { inviteStaffSchema, updatePermissionsSchema, staffResponseSchema, updateStaffSchema } from './schemas.js'
import { createStaffInvitation, getStaffList, updatePermissions, updateStaff, deleteStaff, updateStaffStatus } from './service.js'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

export default async function staffRoutes(app: FastifyInstance) {
    const server = app.withTypeProvider<ZodTypeProvider>()

    server.post(
        '/invite',
        {
            schema: {
                body: inviteStaffSchema,
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user
            const invitation = await createStaffInvitation(request.body, tenantId)
            return reply.code(201).send(invitation)
        }
    )

    server.get(
        '/',
        {
            schema: {
                response: {
                    200: z.array(staffResponseSchema),
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user
            const staff = await getStaffList(tenantId)
            return reply.send(staff)
        }
    )

    server.patch(
        '/permissions',
        {
            schema: {
                body: updatePermissionsSchema,
            },
        },
        async (request, reply) => {
            const { userId, permissions } = request.body
            const updatedUser = await updatePermissions(userId, permissions)
            return reply.send(updatedUser)
        }
    )

    // ── Staff Suspend / Terminate ─────────────────────────────────────────────
    server.patch(
        '/:id/status',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: z.object({
                    status: z.enum(['SUSPENDED', 'TERMINATED']),
                    reason: z.string().optional(),
                }),
                response: {
                    200: z.object({ message: z.string(), userId: z.string(), status: z.string() }),
                    404: z.object({ message: z.string() }),
                },
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user
            const { id } = request.params
            const { status, reason } = request.body
            try {
                const updated = await updateStaffStatus(id, tenantId, status, reason)
                return reply.send({
                    message: `Staff member has been ${status.toLowerCase()} and access has been revoked.`,
                    userId: updated.id,
                    status: updated.status,
                })
            } catch {
                return reply.code(404).send({ message: 'Staff member not found.' })
            }
        }
    )

    server.put(
        '/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
                body: updateStaffSchema,
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user
            const { id } = request.params
            const updatedStaff = await updateStaff(id, tenantId, request.body)
            return reply.send(updatedStaff)
        }
    )

    server.delete(
        '/:id',
        {
            schema: {
                params: z.object({ id: z.string() }),
            },
        },
        async (request, reply) => {
            const { tenantId } = request.user
            const { id } = request.params
            await deleteStaff(id, tenantId)
            return reply.code(204).send()
        }
    )
}

