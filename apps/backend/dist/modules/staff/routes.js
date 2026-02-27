import { inviteStaffSchema, updatePermissionsSchema, staffResponseSchema } from './schemas.js';
import { createStaffInvitation, getStaffList, updatePermissions } from './service.js';
import { z } from 'zod';
export default async function staffRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/invite', {
        schema: {
            body: inviteStaffSchema,
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const invitation = await createStaffInvitation(request.body, tenantId);
        return reply.code(201).send(invitation);
    });
    server.get('/', {
        schema: {
            response: {
                200: z.array(staffResponseSchema),
            },
        },
    }, async (request, reply) => {
        const { tenantId } = request.user;
        const staff = await getStaffList(tenantId);
        return reply.send(staff);
    });
    server.patch('/permissions', {
        schema: {
            body: updatePermissionsSchema,
        },
    }, async (request, reply) => {
        const { userId, permissions } = request.body;
        const updatedUser = await updatePermissions(userId, permissions);
        return reply.send(updatedUser);
    });
}
