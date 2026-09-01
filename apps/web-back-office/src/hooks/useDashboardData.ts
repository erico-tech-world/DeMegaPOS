import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL, WS_URL } from '../lib/apiConfig';


export const useDashboardData = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [dashboardSummary, setDashboardSummary] = useState<any>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { logout, token } = useAuth();

    const fetchProducts = useCallback(async () => {
        if (!token) return;
        try {
            const res = await axios.get(`${API_URL}/inventory/products`);
            setProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch products:', err);
            if (axios.isAxiosError(err) && err.response?.status === 401) logout();
        }
    }, [token, logout]);

    const [integrations, setIntegrations] = useState<any[]>([]);

    const fetchIntegrations = useCallback(async () => {
        if (!token) return [];
        try {
            const res = await axios.get(`${API_URL}/integrations`);
            setIntegrations(res.data);
            return res.data;
        } catch (err) {
            console.error('Failed to fetch integrations:', err);
            return [];
        }
    }, [token]);

    const createIntegration = async (data: any) => {
        try {
            const res = await axios.post(`${API_URL}/integrations`, data);
            await fetchIntegrations();
            return res.data;
        } catch (err) {
            console.error('Failed to create integration:', err);
            throw err;
        }
    };

    const deleteIntegration = async (id: string) => {
        try {
            await axios.delete(`${API_URL}/integrations/${id}`);
            await fetchIntegrations();
        } catch (err) {
            console.error('Failed to delete integration:', err);
            throw err;
        }
    };

    const fetchUnmappedTransactions = async (integrationId?: string) => {
        try {
            const res = await axios.get(`${API_URL}/integrations/unmapped-transactions`, {
                params: { integrationId }
            });
            return res.data;
        } catch (err) {
            console.error('Failed to fetch unmapped transactions:', err);
            return [];
        }
    };

    const mapTerminalTransaction = async (orderId: string, data: any) => {
        try {
            const res = await axios.post(`${API_URL}/integrations/orders/${orderId}/map-terminal`, data);
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Failed to map terminal transaction:', err);
            throw err;
        }
    };

    const handleManualPayment = async (orderId: string, posDeviceType: string) => {
        try {
            const res = await axios.post(`${API_URL}/integrations/orders/${orderId}/manual-payment`, { posDeviceType });
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Failed to process manual payment:', err);
            throw err;
        }
    };

    const [draftOrders, setDraftOrders] = useState<any[]>([]);

    const fetchDraftOrders = useCallback(async () => {
        if (!token) return [];
        try {
            const storeId = localStorage.getItem('selectedBranchId') || undefined;
            const res = await axios.get(`${API_URL}/orders/drafts`, {
                params: storeId ? { storeId } : undefined
            });
            setDraftOrders(res.data || []);
            return res.data;
        } catch (err) {
            console.error('Failed to fetch draft orders:', err);
            return [];
        }
    }, [token]);


    const createDraftOrder = async (orderData: any) => {
        try {
            const res = await axios.post(`${API_URL}/orders`, {
                ...orderData,
                paymentStatus: 'DRAFT'
            });
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Error creating draft order:', err);
            throw err;
        }
    };

    const lockDraftOrder = async (orderId: string) => {
        try {
            const res = await axios.patch(`${API_URL}/orders/drafts/${orderId}/lock`);
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Error locking draft order:', err);
            throw err;
        }
    };

    const cancelDraftOrder = async (orderId: string) => {
        try {
            await axios.delete(`${API_URL}/orders/drafts/${orderId}`);
            await fetchData();
        } catch (err) {
            console.error('Error canceling draft order:', err);
            throw err;
        }
    };

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        const storeId = localStorage.getItem('selectedBranchId') || undefined;
        try {
            // Fetch products independently so a failure in orders/staff/customers
            // does NOT prevent the product list from loading
            const [pRes, oRes, sRes, cRes, iRes, dRes, sumRes] = await Promise.allSettled([
                axios.get(`${API_URL}/inventory/products`),
                axios.get(`${API_URL}/orders`, { params: { storeId } }),
                axios.get(`${API_URL}/staff`),
                axios.get(`${API_URL}/customers`),
                axios.get(`${API_URL}/integrations`),
                axios.get(`${API_URL}/orders/drafts`, { params: { storeId } }),
                axios.get(`${API_URL}/orders/dashboard-summary`, { params: { storeId } }),
            ]);

            if (pRes.status === 'fulfilled') setProducts(pRes.value.data);
            else {
                console.error('Products fetch failed:', pRes.reason);
                if (axios.isAxiosError(pRes.reason) && pRes.reason.response?.status === 401) { logout(); return; }
            }

            if (oRes.status === 'fulfilled') setOrders(oRes.value.data);
            else console.error('Orders fetch failed:', oRes.reason);

            if (sRes.status === 'fulfilled') setStaff(sRes.value.data);
            else console.error('Staff fetch failed:', sRes.reason);

            if (cRes.status === 'fulfilled') setCustomers(cRes.value.data);
            else console.error('Customers fetch failed:', cRes.reason);

            if (iRes.status === 'fulfilled') setIntegrations(iRes.value.data);
            else console.error('Integrations fetch failed:', iRes.reason);

            if (dRes.status === 'fulfilled') setDraftOrders(dRes.value.data);
            else console.error('Draft orders fetch failed:', dRes.reason);

            if (sumRes.status === 'fulfilled') setDashboardSummary(sumRes.value.data);
            else console.error('Dashboard summary fetch failed:', sumRes.reason);

        } finally {
            setIsLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        if (!token) return;

        fetchData();

        let ws: WebSocket | null = null;
        let reconnectTimeout: any = null;
        let isMounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 5;

        const connectWs = () => {
            if (!isMounted || !token) return;
            try {
                ws = new WebSocket(WS_URL);

                ws.onopen = () => {
                    retryCount = 0; // Reset retry counter on successful handshake
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (
                            data.event === 'ORDER_CREATED' ||
                            data.event === 'STOCK_UPDATED' ||
                            data.event === 'PRODUCT_CREATED' ||
                            data.event === 'ORDER_UPDATED' ||
                            data.event === 'PAYMENT_SUCCESS' ||
                            data.event === 'REFUND_PROCESSED'
                        ) {
                            fetchData();
                        }
                    } catch (e) {
                        console.error('[WS] Message parse error:', e);
                    }
                };

                ws.onclose = () => {
                    if (isMounted && retryCount < MAX_RETRIES) {
                        retryCount++;
                        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
                        reconnectTimeout = setTimeout(connectWs, delay);
                    }
                };

                ws.onerror = () => {
                    try { ws?.close(); } catch {}
                };
            } catch (err) {
                if (isMounted && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
                    reconnectTimeout = setTimeout(connectWs, delay);
                }
            }
        };

        connectWs();

        // ── Clean Branch Change Listener ─────────────────────────────────────────
        const handleBranchChange = () => {
            fetchData();
        };
        window.addEventListener('demega:branch-changed', handleBranchChange);

        return () => {
            isMounted = false;
            if (ws) {
                ws.onclose = null;
                ws.close();
            }
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            window.removeEventListener('demega:branch-changed', handleBranchChange);
        };
    }, [token, fetchData]);

    const handleCreateOrder = async (orderData: any) => {
        try {
            const res = await axios.post(`${API_URL}/orders`, orderData);
            // Optimistically prepend new/completed order into local state for instant 0ms UI update
            if (res.data && res.data.id) {
                setOrders(prev => {
                    const exists = prev.some(o => o.id === res.data.id);
                    if (exists) {
                        return prev.map(o => o.id === res.data.id ? res.data : o);
                    }
                    return [res.data, ...prev];
                });
            }
            // If checking out a draft order, optimistically remove it from draftOrders
            const completedDraftId = orderData.draftId || (orderData.paymentStatus !== 'DRAFT' && res.data?.id);
            if (completedDraftId && orderData.paymentStatus !== 'DRAFT') {
                setDraftOrders(prev => prev.filter(d => d.id !== completedDraftId && d.id !== orderData.draftId));
            }
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Error creating order:', err);
            throw err;
        }
    };

    const resetFinancials = async (storeId?: string) => {
        try {
            const res = await axios.post(`${API_URL}/orders/reset-financials`, {
                storeId,
                confirm: true
            });
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Error resetting financials:', err);
            throw err;
        }
    };

    return {
        products,
        orders,
        draftOrders,
        dashboardSummary,
        staff,
        customers,
        integrations,
        isLoading,
        refresh: fetchData,
        refreshProducts: fetchProducts,
        fetchIntegrations,
        fetchDraftOrders,
        createIntegration,
        deleteIntegration,
        fetchUnmappedTransactions,
        mapTerminalTransaction,
        handleManualPayment,
        handleCreateOrder,
        createDraftOrder,
        lockDraftOrder,
        cancelDraftOrder,
        resetFinancials
    };
};

