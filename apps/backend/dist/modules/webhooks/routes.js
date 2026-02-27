import { createAppSchema, appResponseSchema } from './schemas.js';
import { registerApp, getApps } from './service.js';
export default async function webhookRoutes(app) {
    const server = app.withTypeProvider();
    server.post('/apps', {
        schema: {
            body: createAppSchema,
            response: {
                201: appResponseSchema,
            },
        },
    }, async (request, reply) => {
        const registeredApp = await registerApp(request.body);
        return reply.code(201).send(registeredApp);
    });
    server.get('/apps', {
        schema: {
            response: {
                200: {
                    type: 'array',
                    items: appResponseSchema,
                },
            },
        },
    }, async () => {
        return getApps();
    });
}
