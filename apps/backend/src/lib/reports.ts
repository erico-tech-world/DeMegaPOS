import { prisma } from './prisma.js'

export type ReportPeriod = 'weekly' | 'monthly' | 'yearly'

export interface ReportAggregationData {
    period: ReportPeriod
    periodLabel: string
    startDate: Date
    endDate: Date
    businessName: string
    branchName?: string
    isBranchReport: boolean
    metrics: {
        grossRevenue: number
        totalRefunds: number
        netRevenue: number
        completedOrdersCount: number
        refundOrdersCount: number
        averageOrderValue: number
        newCustomersCount: number
    }
    paymentMethods: Array<{ method: string; total: number; count: number }>
    topProducts: Array<{ name: string; quantity: number; revenue: number }>
    lowStockItems: Array<{ name: string; currentStock: number; minStock: number; unit?: string | null }>
    staffMetrics: Array<{ name: string; staffCode?: string | null; ordersCount: number; totalSales: number }>
}

function computeDateRange(period: ReportPeriod): { startDate: Date; endDate: Date; periodLabel: string } {
    const endDate = new Date()
    const startDate = new Date()

    if (period === 'weekly') {
        startDate.setDate(endDate.getDate() - 7)
        return {
            startDate,
            endDate,
            periodLabel: `Weekly Digest (${startDate.toLocaleDateString('en-GB')} – ${endDate.toLocaleDateString('en-GB')})`
        }
    } else if (period === 'monthly') {
        startDate.setDate(endDate.getDate() - 30)
        return {
            startDate,
            endDate,
            periodLabel: `Monthly Performance Review (${startDate.toLocaleDateString('en-GB')} – ${endDate.toLocaleDateString('en-GB')})`
        }
    } else {
        startDate.setDate(endDate.getDate() - 365)
        return {
            startDate,
            endDate,
            periodLabel: `Annual Executive Review (${startDate.toLocaleDateString('en-GB')} – ${endDate.toLocaleDateString('en-GB')})`
        }
    }
}

/**
 * Aggregate Tenant-Level Performance Data across all branches
 */
export async function aggregateTenantReport(tenantId: string, period: ReportPeriod): Promise<ReportAggregationData> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true }
    })

    const businessName = tenant?.name || 'DeMega Enterprise'
    const { startDate, endDate, periodLabel } = computeDateRange(period)

    // 1. Query Paid Orders
    const paidOrders = await prisma.order.findMany({
        where: {
            store: { tenantId },
            paymentStatus: { in: ['PAID', 'SUCCESS'] },
            createdAt: { gte: startDate, lte: endDate }
        },
        include: {
            cashier: { select: { id: true, name: true, staffCode: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true } }
                }
            },
            splitPayments: true
        }
    })

    // 2. Query Refunds
    const refunds = await prisma.refund.findMany({
        where: {
            order: { store: { tenantId } },
            createdAt: { gte: startDate, lte: endDate }
        }
    })

    // 3. New Customers
    const newCustomersCount = await prisma.customer.count({
        where: {
            tenantId,
            createdAt: { gte: startDate, lte: endDate }
        }
    })

    // 4. Low stock products globally
    const products = await prisma.product.findMany({
        where: { tenantId },
        select: { id: true, name: true, stock: true, minStock: true, unit: true }
    })
    const lowStockItems = products
        .filter(p => p.stock <= p.minStock)
        .slice(0, 10)
        .map(p => ({
            name: p.name,
            currentStock: p.stock,
            minStock: p.minStock,
            unit: p.unit
        }))

    // Calculate revenue metrics
    const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const netRevenue = Math.max(0, grossRevenue - totalRefunds)
    const completedOrdersCount = paidOrders.length
    const averageOrderValue = completedOrdersCount > 0 ? grossRevenue / completedOrdersCount : 0

    // Payment method breakdown
    const paymentMap: Record<string, { total: number; count: number }> = {}
    for (const o of paidOrders) {
        if (o.splitPayments && o.splitPayments.length > 0) {
            for (const sp of o.splitPayments) {
                const method = sp.method || 'SPLIT'
                if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 }
                paymentMap[method].total += Number(sp.amount || 0)
                paymentMap[method].count += 1
            }
        } else {
            const method = o.paymentMethod || 'CASH'
            if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 }
            paymentMap[method].total += Number(o.totalAmount || 0)
            paymentMap[method].count += 1
        }
    }
    const paymentMethods = Object.entries(paymentMap).map(([method, data]) => ({
        method,
        total: Math.round(data.total * 100) / 100,
        count: data.count
    }))

    // Top Selling Products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    for (const o of paidOrders) {
        for (const it of o.items) {
            const pid = it.productId
            const pName = it.product?.name || 'Unknown Product'
            if (!productSalesMap[pid]) productSalesMap[pid] = { name: pName, quantity: 0, revenue: 0 }
            productSalesMap[pid].quantity += it.quantity
            productSalesMap[pid].revenue += Number(it.price || 0) * it.quantity
        }
    }
    const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    // Staff Performance
    const staffMap: Record<string, { name: string; staffCode?: string | null; ordersCount: number; totalSales: number }> = {}
    for (const o of paidOrders) {
        const sId = o.cashierId || 'unassigned'
        const sName = o.cashier?.name || 'Direct / Unassigned'
        const sCode = o.cashier?.staffCode
        if (!staffMap[sId]) staffMap[sId] = { name: sName, staffCode: sCode, ordersCount: 0, totalSales: 0 }
        staffMap[sId].ordersCount += 1
        staffMap[sId].totalSales += Number(o.totalAmount || 0)
    }
    const staffMetrics = Object.values(staffMap)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5)

    return {
        period,
        periodLabel,
        startDate,
        endDate,
        businessName,
        isBranchReport: false,
        metrics: {
            grossRevenue: Math.round(grossRevenue * 100) / 100,
            totalRefunds: Math.round(totalRefunds * 100) / 100,
            netRevenue: Math.round(netRevenue * 100) / 100,
            completedOrdersCount,
            refundOrdersCount: refunds.length,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
            newCustomersCount
        },
        paymentMethods,
        topProducts,
        lowStockItems,
        staffMetrics
    }
}

/**
 * Aggregate Branch-Level Performance Data scoped to an individual Store
 */
export async function aggregateBranchReport(storeId: string, tenantId: string, period: ReportPeriod): Promise<ReportAggregationData> {
    const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: { tenant: { select: { name: true } } }
    })

    const businessName = store?.tenant?.name || 'DeMega Enterprise'
    const branchName = store?.name || 'Branch'
    const { startDate, endDate, periodLabel } = computeDateRange(period)

    // 1. Query Paid Orders scoped to store
    const paidOrders = await prisma.order.findMany({
        where: {
            storeId,
            paymentStatus: { in: ['PAID', 'SUCCESS'] },
            createdAt: { gte: startDate, lte: endDate }
        },
        include: {
            cashier: { select: { id: true, name: true, staffCode: true } },
            items: {
                include: {
                    product: { select: { id: true, name: true } }
                }
            },
            splitPayments: true
        }
    })

    // 2. Query Refunds scoped to store
    const refunds = await prisma.refund.findMany({
        where: {
            order: { storeId },
            createdAt: { gte: startDate, lte: endDate }
        }
    })

    // 3. New Customers registered for this branch
    const newCustomersCount = await prisma.customer.count({
        where: {
            tenantId,
            branchId: storeId,
            createdAt: { gte: startDate, lte: endDate }
        }
    })

    // 4. Low stock branch inventory items
    const branchInventories = await prisma.branchInventory.findMany({
        where: { storeId },
        include: {
            product: { select: { name: true, unit: true } }
        }
    })

    const lowStockItems = branchInventories
        .filter(bi => bi.stock <= bi.minStock)
        .slice(0, 10)
        .map(bi => ({
            name: bi.product?.name || 'Unknown Item',
            currentStock: bi.stock,
            minStock: bi.minStock,
            unit: bi.product?.unit
        }))

    // Calculate revenue metrics
    const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0)
    const netRevenue = Math.max(0, grossRevenue - totalRefunds)
    const completedOrdersCount = paidOrders.length
    const averageOrderValue = completedOrdersCount > 0 ? grossRevenue / completedOrdersCount : 0

    // Payment method breakdown
    const paymentMap: Record<string, { total: number; count: number }> = {}
    for (const o of paidOrders) {
        if (o.splitPayments && o.splitPayments.length > 0) {
            for (const sp of o.splitPayments) {
                const method = sp.method || 'SPLIT'
                if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 }
                paymentMap[method].total += Number(sp.amount || 0)
                paymentMap[method].count += 1
            }
        } else {
            const method = o.paymentMethod || 'CASH'
            if (!paymentMap[method]) paymentMap[method] = { total: 0, count: 0 }
            paymentMap[method].total += Number(o.totalAmount || 0)
            paymentMap[method].count += 1
        }
    }
    const paymentMethods = Object.entries(paymentMap).map(([method, data]) => ({
        method,
        total: Math.round(data.total * 100) / 100,
        count: data.count
    }))

    // Top Selling Products
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {}
    for (const o of paidOrders) {
        for (const it of o.items) {
            const pid = it.productId
            const pName = it.product?.name || 'Unknown Product'
            if (!productSalesMap[pid]) productSalesMap[pid] = { name: pName, quantity: 0, revenue: 0 }
            productSalesMap[pid].quantity += it.quantity
            productSalesMap[pid].revenue += Number(it.price || 0) * it.quantity
        }
    }
    const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

    // Staff Performance
    const staffMap: Record<string, { name: string; staffCode?: string | null; ordersCount: number; totalSales: number }> = {}
    for (const o of paidOrders) {
        const sId = o.cashierId || 'unassigned'
        const sName = o.cashier?.name || 'Direct / Unassigned'
        const sCode = o.cashier?.staffCode
        if (!staffMap[sId]) staffMap[sId] = { name: sName, staffCode: sCode, ordersCount: 0, totalSales: 0 }
        staffMap[sId].ordersCount += 1
        staffMap[sId].totalSales += Number(o.totalAmount || 0)
    }
    const staffMetrics = Object.values(staffMap)
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 5)

    return {
        period,
        periodLabel,
        startDate,
        endDate,
        businessName,
        branchName,
        isBranchReport: true,
        metrics: {
            grossRevenue: Math.round(grossRevenue * 100) / 100,
            totalRefunds: Math.round(totalRefunds * 100) / 100,
            netRevenue: Math.round(netRevenue * 100) / 100,
            completedOrdersCount,
            refundOrdersCount: refunds.length,
            averageOrderValue: Math.round(averageOrderValue * 100) / 100,
            newCustomersCount
        },
        paymentMethods,
        topProducts,
        lowStockItems,
        staffMetrics
    }
}

/**
 * Format currency in Nigerian Naira (₦)
 */
function formatCurrency(amount: number): string {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Build rich executive HTML Email template
 */
export function buildReportHtml(data: ReportAggregationData): string {
    const titleScope = data.isBranchReport ? `${data.branchName} Branch` : 'Omni-Branch Executive'
    const periodName = data.period.toUpperCase()

    const topProductsRows = data.topProducts.length > 0
        ? data.topProducts.map((p, idx) => `
            <tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; font-weight: 600; color: #1F2937;">#${idx + 1} ${p.name}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #4B5563;">${p.quantity}</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #047857;">${formatCurrency(p.revenue)}</td>
            </tr>`).join('')
        : `<tr><td colspan="3" style="padding: 14px; text-align: center; color: #9CA3AF;">No sales recorded during this cycle.</td></tr>`

    const paymentRows = data.paymentMethods.length > 0
        ? data.paymentMethods.map(pm => `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-size: 13px; font-weight: 700; color: #374151;">${pm.method}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; text-align: center; font-size: 13px; color: #6B7280;">${pm.count} txns</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; text-align: right; font-size: 13px; font-weight: 700; color: #111827;">${formatCurrency(pm.total)}</td>
            </tr>`).join('')
        : `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #9CA3AF; font-size: 13px;">No transactions recorded.</td></tr>`

    const staffRows = data.staffMetrics.length > 0
        ? data.staffMetrics.map(sm => `
            <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; font-size: 13px; font-weight: 600; color: #374151;">
                    ${sm.name} ${sm.staffCode ? `<span style="font-size: 11px; color: #9CA3AF;">(${sm.staffCode})</span>` : ''}
                </td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; text-align: center; font-size: 13px; color: #6B7280;">${sm.ordersCount}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F3F4F6; text-align: right; font-size: 13px; font-weight: 700; color: #047857;">${formatCurrency(sm.totalSales)}</td>
            </tr>`).join('')
        : `<tr><td colspan="3" style="padding: 10px; text-align: center; color: #9CA3AF; font-size: 13px;">No staff cashier activity recorded.</td></tr>`

    const lowStockSection = data.lowStockItems.length > 0
        ? `
        <div style="margin-top: 24px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 12px; padding: 18px;">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 14px; font-weight: 800; color: #B45309; text-transform: uppercase; letter-spacing: 0.5px;">⚠️ Low Stock Attention Items (${data.lowStockItems.length})</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="text-align: left; color: #92400E; border-bottom: 1px solid #FDE68A;">
                        <th style="padding: 6px 8px;">Product</th>
                        <th style="padding: 6px 8px; text-align: center;">Current Stock</th>
                        <th style="padding: 6px 8px; text-align: right;">Min Alert Threshold</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.lowStockItems.map(item => `
                        <tr>
                            <td style="padding: 6px 8px; color: #78350F; font-weight: 600;">${item.name}</td>
                            <td style="padding: 6px 8px; text-align: center; font-weight: 800; color: #DC2626;">${item.currentStock} ${item.unit || ''}</td>
                            <td style="padding: 6px 8px; text-align: right; color: #92400E;">${item.minStock}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`
        : `
        <div style="margin-top: 24px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 14px 18px; color: #166534; font-size: 13px; font-weight: 600;">
            ✅ Healthy Inventory: No products breached minimum reorder thresholds.
        </div>`

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.businessName} - ${periodName} Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 32px 12px; color: #1E293B;">
  <div style="max-width: 680px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 40%, #1B4332 100%); padding: 36px 32px; color: #FFFFFF;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <span style="background: rgba(45, 122, 62, 0.4); border: 1px solid #2D7A3E; color: #6EE7B7; font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 999px;">
          ${periodName} PERFORMANCE AUDIT
        </span>
        <span style="font-size: 12px; color: #94A3B8;">DeMegaPOS Engine</span>
      </div>
      <h1 style="font-size: 26px; font-weight: 900; margin: 0; letter-spacing: -0.5px; line-height: 1.2;">
        ${data.businessName}
      </h1>
      <p style="font-size: 14px; color: #CBD5E1; margin: 8px 0 0; font-weight: 500;">
        ${titleScope} · ${data.periodLabel}
      </p>
    </div>

    <div style="padding: 32px;">
      <!-- Key KPI Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;">
        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 18px;">
          <div style="font-size: 11px; font-weight: 800; color: #15803D; text-transform: uppercase; letter-spacing: 0.5px;">Net Revenue</div>
          <div style="font-size: 24px; font-weight: 900; color: #14532D; margin-top: 6px;">${formatCurrency(data.metrics.netRevenue)}</div>
          <div style="font-size: 11px; color: #166534; margin-top: 4px;">Gross: ${formatCurrency(data.metrics.grossRevenue)}</div>
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 18px;">
          <div style="font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Orders Processed</div>
          <div style="font-size: 24px; font-weight: 900; color: #0F172A; margin-top: 6px;">${data.metrics.completedOrdersCount}</div>
          <div style="font-size: 11px; color: #64748B; margin-top: 4px;">Avg Ticket: ${formatCurrency(data.metrics.averageOrderValue)}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 28px;">
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 14px; padding: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #B91C1C; text-transform: uppercase; letter-spacing: 0.5px;">Refunds Handled</div>
          <div style="font-size: 20px; font-weight: 900; color: #7F1D1D; margin-top: 4px;">${formatCurrency(data.metrics.totalRefunds)}</div>
          <div style="font-size: 11px; color: #991B1B; margin-top: 2px;">${data.metrics.refundOrdersCount} return record(s)</div>
        </div>
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 14px; padding: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #1D4ED8; text-transform: uppercase; letter-spacing: 0.5px;">Customer Acquisition</div>
          <div style="font-size: 20px; font-weight: 900; color: #1E3A8A; margin-top: 4px;">+${data.metrics.newCustomersCount}</div>
          <div style="font-size: 11px; color: #1E40AF; margin-top: 2px;">New CRM profiles registered</div>
        </div>
      </div>

      <!-- Top Selling Products -->
      <div style="margin-bottom: 28px;">
        <h3 style="font-size: 15px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">
          🏆 Top Volume &amp; Revenue Generators
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #F1F5F9; color: #475569; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 10px 14px; border-radius: 8px 0 0 8px;">Product</th>
              <th style="padding: 10px 14px; text-align: center;">Qty Sold</th>
              <th style="padding: 10px 14px; text-align: right; border-radius: 0 8px 8px 0;">Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topProductsRows}
          </tbody>
        </table>
      </div>

      <!-- Two Column: Payment Breakdown & Staff Performance -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">
            💳 Payment Channels
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
        </div>

        <div>
          <h4 style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px;">
            🧑‍💼 Staff Activity
          </h4>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${staffRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Low Stock Section -->
      ${lowStockSection}
    </div>

    <!-- Footer -->
    <div style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 24px 32px; text-align: center;">
      <p style="font-size: 12px; color: #64748B; margin: 0 0 6px;">
        Generated automatically by <strong>DeMegaPOS Automated Reporting Engine</strong>
      </p>
      <p style="font-size: 11px; color: #94A3B8; margin: 0;">
        Confidential Enterprise Financial Audit. For internal executive decision-making only.
      </p>
    </div>
  </div>
</body>
</html>`
}
