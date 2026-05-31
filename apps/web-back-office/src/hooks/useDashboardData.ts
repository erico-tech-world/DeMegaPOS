import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

export const useDashboardData = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
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

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            // Fetch products independently so a failure in orders/staff/customers
            // does NOT prevent the product list from loading
            const [pRes, oRes, sRes, cRes] = await Promise.allSettled([
                axios.get(`${API_URL}/inventory/products`),
                axios.get(`${API_URL}/orders`),
                axios.get(`${API_URL}/staff`),
                axios.get(`${API_URL}/customers`),
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

        } finally {
            setIsLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        if (!token) return;

        fetchData();

        const ws = new WebSocket(WS_URL);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.event === 'ORDER_CREATED' || data.event === 'STOCK_UPDATED' || data.event === 'PRODUCT_CREATED') {
                    fetchData();
                }
            } catch (e) {
                console.error('WS Error:', e);
            }
        };

        return () => ws.close();
    }, [token, fetchData]);

    const handleCreateOrder = async (orderData: any) => {
        try {
            const res = await axios.post(`${API_URL}/orders`, orderData);
            await fetchData();
            return res.data;
        } catch (err) {
            console.error('Error creating order:', err);
            throw err;
        }
    };

    return {
        products,
        orders,
        staff,
        customers,
        isLoading,
        refresh: fetchData,
        refreshProducts: fetchProducts,
        handleCreateOrder
    };
};
