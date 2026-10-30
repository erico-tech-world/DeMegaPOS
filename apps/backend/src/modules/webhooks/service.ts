import { prisma } from '../../lib/prisma.js'
import { CreateAppInput } from './schemas.js'
import crypto from 'crypto'

export async function registerApp(data: CreateAppInput) {
    const clientId = crypto.randomBytes(16).toString('hex')
    const clientSecret = crypto.randomBytes(32).toString('hex')

    return prisma.integrationApp.create({
        data: {
            name: data.name,
            clientId,
            clientSecret,
            scopes: data.scopes,
            webhookUrl: data.webhookUrl,
        },
    })
}

export async function getApps() {
    return prisma.integrationApp.findMany()
}

export async function sendWebhook(appId: string, event: string, payload: any) {
    const app = await prisma.integrationApp.findUnique({
        where: { id: appId },
    })

    if (!app || !app.webhookUrl) return

    try {
        const response = await fetch(app.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-POS-Event': event,
            },
            body: JSON.stringify(payload),
        })

        if (!response.ok) {
            // Here we could implement retry logic using BullMQ
            console.error(`Webhook delivery failed: ${response.statusText}`)
        }
    } catch (error) {
        console.error('Error sending webhook:', error)
    }
}
