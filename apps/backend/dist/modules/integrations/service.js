import { prisma } from '../../lib/prisma.js';
export async function getTenantIntegrations(tenantId) {
    return prisma.terminalIntegration.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
    });
}
export async function createTenantIntegration(tenantId, data) {
    return prisma.terminalIntegration.create({
        data: {
            tenantId,
            provider: data.provider,
            label: data.label || 'Default Terminal',
            apiKey: data.apiKey,
            secretKey: data.secretKey,
            contractCode: data.contractCode,
            baseUrl: data.baseUrl || 'https://sandbox.monnify.com',
            isActive: data.isActive ?? true,
        },
    });
}
export async function deleteTenantIntegration(tenantId, integrationId) {
    return prisma.terminalIntegration.deleteMany({
        where: { id: integrationId, tenantId },
    });
}
/**
 * Fetch unmapped transactions for the given tenant/integration.
 * Queries Monnify API (or fallback logic) and excludes transactionRefs already saved in TerminalTransaction.
 */
export async function getUnmappedMonnifyTransactions(tenantId, integrationId) {
    // 1. Locate integration config
    let integration = integrationId
        ? await prisma.terminalIntegration.findFirst({ where: { id: integrationId, tenantId } })
        : await prisma.terminalIntegration.findFirst({ where: { tenantId, isActive: true, provider: 'MONNIFY' } });
    const apiKey = integration?.apiKey || process.env.MONNIFY_API_KEY;
    const secretKey = integration?.secretKey || process.env.MONNIFY_SECRET_KEY;
    const contractCode = integration?.contractCode || process.env.MONNIFY_CONTRACT_CODE;
    const baseUrl = integration?.baseUrl || process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';
    // Fetch existing mapped transaction references from DB to exclude them
    const existingMapped = await prisma.terminalTransaction.findMany({
        select: { transactionRef: true }
    });
    const mappedRefs = new Set(existingMapped.map(t => t.transactionRef));
    let rawTransactions = [];
    if (apiKey && secretKey) {
        try {
            // 2. Authenticate with Monnify
            const authHeader = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
            const authRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${authHeader}`,
                    'Content-Type': 'application/json',
                },
            });
            const authData = await authRes.json();
            const accessToken = authData?.responseBody?.accessToken;
            if (accessToken) {
                // 3. Search today's transactions
                const searchRes = await fetch(`${baseUrl}/api/v1/transactions/search?paymentStatus=PAID&page=0&size=20`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                });
                const searchData = await searchRes.json();
                const content = searchData?.responseBody?.content || [];
                rawTransactions = content;
            }
        }
        catch (err) {
            console.error('[Monnify] Error fetching transactions from Monnify API:', err);
        }
    }
    // Filter out already mapped transactions
    const unmapped = rawTransactions.filter(tx => tx.transactionReference && !mappedRefs.has(tx.transactionReference));
    return unmapped.map(tx => ({
        transactionReference: tx.transactionReference,
        paymentReference: tx.paymentReference,
        amount: tx.amountPaid || tx.amount,
        customerName: tx.customerName || tx.customer?.name || 'Walk-in Customer',
        customerPhone: tx.customerPhone || tx.customer?.email || '',
        paymentMethod: tx.paymentMethod || 'CARD',
        paidOn: tx.paidOn || tx.createdOn || new Date().toISOString(),
        raw: tx,
    }));
}
export async function mapTerminalTransactionToOrder(orderId, data) {
    const existing = await prisma.terminalTransaction.findUnique({
        where: { orderId },
    });
    if (existing) {
        throw new Error('Order already has a mapped terminal transaction');
    }
    // 1. Create TerminalTransaction record
    const terminalTx = await prisma.terminalTransaction.create({
        data: {
            orderId,
            integrationId: data.integrationId || '',
            transactionRef: data.transactionRef,
            paymentRef: data.paymentRef,
            amount: data.amount,
            settledAt: data.settledAt ? new Date(data.settledAt) : new Date(),
            rawResponse: data.rawResponse || {},
        },
    });
    // 2. Mark Order paymentStatus as SUCCESS
    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            paymentStatus: 'SUCCESS',
        },
        include: {
            items: { include: { product: true } },
            customer: true,
            cashier: true,
            terminalTransaction: true,
        },
    });
    return { terminalTx, order: updatedOrder };
}
export async function recordManualPosDevice(orderId, posDeviceType) {
    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            posDeviceType,
            paymentStatus: 'SUCCESS',
        },
        include: {
            items: { include: { product: true } },
            customer: true,
            cashier: true,
            terminalTransaction: true,
        },
    });
    return updatedOrder;
}
