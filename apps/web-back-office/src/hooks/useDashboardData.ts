import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

export const useDashboardData = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { logout, token } = useAuth();

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [pRes, oRes, sRes, cRes] = await Promise.all([
                axios.get(`${API_URL}/inventory`),
                axios.get(`${API_URL}/orders`),
                axios.get(`${API_URL}/staff`),
                axios.get(`${API_URL}/customers`),
            ]);
            setProducts(pRes.data);
            setOrders(oRes.data);
            setStaff(sRes.data);
            setCustomers(cRes.data);
        } catch (err) {
            console.error('Fetch error:', err);
            if (axios.isAxiosError(err) && err.response?.status === 401) {
                logout();
            }
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
                if (data.event === 'ORDER_CREATED' || data.event === 'STOCK_UPDATED') {
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
            await axios.post(`${API_URL}/orders`, orderData);
            await fetchData();
            return true;
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
        handleCreateOrder
    };
};
