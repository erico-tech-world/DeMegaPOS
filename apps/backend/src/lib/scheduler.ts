import cron from 'node-cron'
import { prisma } from './prisma.js'
import { sendMail } from './mail.js'
import { aggregateTenantReport, aggregateBranchReport, buildReportHtml, ReportPeriod } from './reports.js'

export interface ManualDispatchOptions {
    tenantId: string
    period: ReportPeriod
    storeId?: string
    targetEmail?: string
    requestedBy?: string
}

export interface DispatchResult {
    success: boolean
    tenantId: string
    scope: 'TENANT' | 'BRANCH'
    period: ReportPeriod
    recipients: string[]
    providerUsed?: string
    messageId?: string
    error?: string
}

/**
 * Dispatches an executive report for a given tenant or specific branch.
 * Production-ready for both scheduled jobs and elevated admin on-demand requests.
 */
export async function executeReportDispatch(options: ManualDispatchOptions): Promise<DispatchResult> {
    const { tenantId, period, storeId, targetEmail, requestedBy } = options

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
            users: {
                where: {
                    status: 'ACTIVE',
                    isActive: true,
                    email: { not: null }
                },
                select: { id: true, email: true, role: true, branchId: true, name: true }
            },
            stores: {
                where: { isActive: true },
                select: { id: true, name: true, branchCode: true }
            }
        }
    })

    if (!tenant) {
        throw new Error(`Tenant with ID ${tenantId} not found.`)
    }

    const recipients: string[] = []

    if (targetEmail) {
        recipients.push(targetEmail.trim())
    } else if (storeId) {
        // Find Branch Managers for this store
        const branchManagers = tenant.users.filter(u => u.role === 'BRANCH_MANAGER' && u.branchId === storeId && u.email)
        for (const bm of branchManagers) {
            if (bm.email && !recipients.includes(bm.email)) recipients.push(bm.email)
        }
        // Also include Super Admins
        const superAdmins = tenant.users.filter(u => u.role === 'SUPER_ADMIN' && u.email)
        for (const sa of superAdmins) {
            if (sa.email && !recipients.includes(sa.email)) recipients.push(sa.email)
        }
    } else {
        // Tenant-wide: send to all active Super Admins
        const superAdmins = tenant.users.filter(u => u.role === 'SUPER_ADMIN' && u.email)
        for (const sa of superAdmins) {
            if (sa.email && !recipients.includes(sa.email)) recipients.push(sa.email)
        }
    }

    if (recipients.length === 0) {
        console.warn(`[REPORT-DISPATCH] No valid email recipients found for tenant ${tenant.name} (${tenantId})`)
        return {
            success: false,
            tenantId,
            scope: storeId ? 'BRANCH' : 'TENANT',
            period,
            recipients: [],
            error: 'No active staff recipients with valid email addresses found.'
        }
    }

    console.log(`[REPORT-DISPATCH] Generating ${period} report for ${tenant.name} (Scope: ${storeId || 'OMNI-TENANT'}, Recipients: ${recipients.join(', ')})`)

    let reportData
    if (storeId) {
        reportData = await aggregateBranchReport(storeId, tenantId, period)
    } else {
        reportData = await aggregateTenantReport(tenantId, period)
    }

    const html = buildReportHtml(reportData)
    const scopeLabel = storeId ? `${reportData.branchName} Branch` : 'Executive Omni-Branch'
    const subject = `📊 [${tenant.name}] ${reportData.period.toUpperCase()} Performance Report (${scopeLabel})`

    let lastProvider = 'NONE'
    let lastMessageId: string | undefined

    for (const to of recipients) {
        try {
            const res = await sendMail({
                to,
                subject,
                html
            })
            lastProvider = res.provider
            lastMessageId = res.messageId
            console.log(`[REPORT-DISPATCH] Sent ${period} report to ${to} via ${res.provider}`)
        } catch (err: any) {
            console.error(`[REPORT-DISPATCH] Failed dispatch to ${to}:`, err.message)
        }
    }

    // Log in tenant ActivityLog
    try {
        await prisma.activityLog.create({
            data: {
                tenantId,
                action: 'AUTOMATED_REPORT_DISPATCHED',
                entity: 'Report',
                details: {
                    period,
                    scope: storeId ? 'BRANCH' : 'TENANT',
                    storeId: storeId || null,
                    recipients,
                    requestedBy: requestedBy || 'SCHEDULER_CRON',
                    providerUsed: lastProvider
                }
            }
        })
    } catch (_) {}

    return {
        success: true,
        tenantId,
        scope: storeId ? 'BRANCH' : 'TENANT',
        period,
        recipients,
        providerUsed: lastProvider,
        messageId: lastMessageId
    }
}

/**
 * Runs the automated cycle for all active tenants across the platform.
 */
export async function runScheduledReportCycle(period: ReportPeriod): Promise<void> {
    console.log(`[CRON-REPORT] === Initiating ${period.toUpperCase()} Automated Report Cycle ===`)
    try {
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true }
        })

        for (const tenant of tenants) {
            try {
                // 1. Dispatch Tenant-Level Executive Rollup
                await executeReportDispatch({
                    tenantId: tenant.id,
                    period,
                    requestedBy: 'SYSTEM_CRON_SCHEDULER'
                })

                // 2. Dispatch Branch-Level Reports for individual stores
                const branches = await prisma.store.findMany({
                    where: { tenantId: tenant.id, isActive: true },
                    select: { id: true, name: true }
                })

                for (const branch of branches) {
                    await executeReportDispatch({
                        tenantId: tenant.id,
                        storeId: branch.id,
                        period,
                        requestedBy: 'SYSTEM_CRON_SCHEDULER'
                    })
                }
            } catch (tenantErr: any) {
                console.error(`[CRON-REPORT] Error processing tenant ${tenant.name} (${tenant.id}):`, tenantErr.message)
            }
        }
        console.log(`[CRON-REPORT] === Completed ${period.toUpperCase()} Report Cycle ===`)
    } catch (err: any) {
        console.error(`[CRON-REPORT] Critical error in ${period} cycle:`, err.message)
    }
}

let isInitialized = false

/**
 * Initialize node-cron schedules
 * - Weekly: Sunday at 00:00 UTC (`0 0 * * 0`)
 * - Monthly: 1st of month at 00:00 UTC (`0 0 1 * *`)
 * - Yearly: January 1st at 00:00 UTC (`0 0 1 1 *`)
 */
export function initScheduler(): void {
    if (isInitialized) return
    isInitialized = true

    console.log('[SCHEDULER] Registering Automated Reporting Engine Cron Tasks...')

    // 1. Weekly Report (Every Sunday at 00:00 UTC)
    cron.schedule('0 0 * * 0', async () => {
        console.log('[CRON-TRIGGER] Weekly Report Timer Triggered')
        await runScheduledReportCycle('weekly')
    }, {
        timezone: 'UTC'
    })

    // 2. Monthly Report (1st day of every month at 00:00 UTC)
    cron.schedule('0 0 1 * *', async () => {
        console.log('[CRON-TRIGGER] Monthly Report Timer Triggered')
        await runScheduledReportCycle('monthly')
    }, {
        timezone: 'UTC'
    })

    // 3. Yearly Report (January 1st at 00:00 UTC)
    cron.schedule('0 0 1 1 *', async () => {
        console.log('[CRON-TRIGGER] Yearly Report Timer Triggered')
        await runScheduledReportCycle('yearly')
    }, {
        timezone: 'UTC'
    })

    console.log('[SCHEDULER] Automated Reporting Cron initialized (Weekly: 0 0 * * 0, Monthly: 0 0 1 * *, Yearly: 0 0 1 1 *)')
}
