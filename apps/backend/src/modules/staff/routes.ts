import { FastifyInstance } from 'fastify'
import { inviteStaffSchema, updatePermissionsSchema, staffResponseSchema, updateStaffSchema } from './schemas.js'
import { createStaffInvitation, getStaffList, updatePermissions, updateStaff, deleteStaff } from './service.js'
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
