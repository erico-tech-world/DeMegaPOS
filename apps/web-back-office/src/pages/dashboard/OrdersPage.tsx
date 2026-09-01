import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Download, Calendar, ArrowRight, User as UserIcon, Tag, CreditCard,
    ChevronDown, X, Package, Clock, Play, Trash2, RotateCcw,
    AlertTriangle, CheckCircle, Filter
} from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../lib/apiConfig';

interface OrdersPageProps {
    orders: any[];
    draftOrders?: any[];
    isLoading: boolean;
    refresh?: () => void;
    fetchDraftOrders?: () => Promise<any>;
    cancelDraftOrder?: (id: string) => Promise<void>;
    lockDraftOrder?: (id: string) => Promise<any>;
}

type DateMode = 'preset' | 'single' | 'range';
type SingleTimeMode = 'fullday' | 'exact' | 'custom';

const OrdersPage = ({ orders, draftOrders = [], isLoading, refresh, cancelDraftOrder, lockDraftOrder }: OrdersPageProps) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const highlightId = searchParams.get('id');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // ── Horizontal Filter Row Visibility (Default Visible) ─────────────────────
    const [showFilters, setShowFilters] = useState(true);

    // ── Canonical Filter State (Derived from URL searchParams as Single Source of Truth) ──
    const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
    const mainTab = (searchParams.get('tab') === 'drafts' ? 'drafts' : 'all') as 'all' | 'drafts';

    // ── Statuses & Dropdown Filters ──
    const selectedOrderStatus = (searchParams.get('orderStatus') || searchParams.get('status') || 'ALL').toUpperCase();
    const selectedFulfillmentStatus = (searchParams.get('fulfillmentStatus') || 'ALL').toUpperCase();
    const selectedPaymentStatus = (searchParams.get('paymentStatus') || 'ALL').toUpperCase();
    const selectedPaymentMethod = (searchParams.get('paymentMethod') || 'ALL').toUpperCase();
    const filterCategoryId = searchParams.get('categoryId') || '';
    const selectedBranchId = searchParams.get('branchId') || searchParams.get('storeId') || '';
    const selectedCashierId = searchParams.get('staffId') || searchParams.get('cashierId') || '';

    // ── Strict Product Filter ──
    const filterProductId = searchParams.get('productId') || '';
    const [availableProducts, setAvailableProducts] = useState<{ id: string; name: string }[]>([]);

    // ── Additional Item & Financial Filters ──
    const filterItemName = searchParams.get('itemName') || '';
    const filterMinTotal = searchParams.get('minTotal') || '';
    const filterMaxTotal = searchParams.get('maxTotal') || '';

    // ── Date & Time Filter State (Derived from URL searchParams) ──
    const datePreset = searchParams.get('datePreset') || 'all';
    const singleDate = searchParams.get('singleDate') || '';
    const singleTimeMode = (searchParams.get('singleTimeMode') as SingleTimeMode) || 'fullday';
    const exactTime = searchParams.get('exactTime') || '';
    const exactTolerance = 15; // +/- 15 min tolerance
    const customStartTime = searchParams.get('customStartTime') || '';
    const customEndTime = searchParams.get('customEndTime') || '';
    const rangeStartDate = searchParams.get('startDate') || searchParams.get('rangeStartDate') || '';
    const rangeEndDate = searchParams.get('endDate') || searchParams.get('rangeEndDate') || '';

    const dateMode: DateMode = (searchParams.get('dateMode') as DateMode) || (
        rangeStartDate || rangeEndDate ? 'range' : singleDate ? 'single' : 'preset'
    );

    // ── Categories State (Fetched from Backend API + Extracted from Orders) ────
    const [fetchedCategories, setFetchedCategories] = useState<{ id: string; name: string }[]>([]);

    // ── Confirmation Modal for Draft Deletion ──────────────────────────────────
    const [draftToDelete, setDraftToDelete] = useState<any>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ── Toast Notification ─────────────────────────────────────────────────────
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // ── Refund Modal ────────────────────────────────────────────────────────────
    const [refundTarget, setRefundTarget] = useState<any>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundLoading, setRefundLoading] = useState(false);

    // ── Atomic URL Search Parameter Updater ────────────────────────────────────
    const updateFilterParams = useCallback((updates: Record<string, string | null | undefined>) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            Object.entries(updates).forEach(([key, val]) => {
                if (
                    val === null ||
                    val === undefined ||
                    val === '' ||
                    val === 'ALL' ||
                    (val === 'all' && (key === 'datePreset' || key === 'tab'))
                ) {
                    next.delete(key);
                } else {
                    next.set(key, val);
                }
            });
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // ── Reset All Filters in a Single Action ───────────────────────────────────
    const clearAllFilters = useCallback(() => {
        setSearchParams(prev => {
            const next = new URLSearchParams();
            const highlight = prev.get('id');
            if (highlight) next.set('id', highlight);
            const tab = prev.get('tab');
            if (tab && tab !== 'all') next.set('tab', tab);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // Fetch fresh orders immediately on page mount
    useEffect(() => {
        if (refresh) refresh();
    }, []);

    // Fetch categories from backend API
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/inventory/categories`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Array.isArray(res.data)) {
                    setFetchedCategories(res.data.map((c: any) => ({
                        id: c.id,
                        name: c.name || c.title || 'Unnamed Category'
                    })));
                }
            } catch {
                // Fallback silently if offline
            }
        };
        loadCategories();
    }, []);

    // Fetch products from backend API for the strict product filter dropdown
    useEffect(() => {
        const loadProducts = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/inventory/products`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (Array.isArray(res.data)) {
                    setAvailableProducts(
                        res.data
                            .map((p: any) => ({ id: p.id, name: p.name || `Product ${p.id.slice(0, 6)}` }))
                            .sort((a: { id: string; name: string }, b: { id: string; name: string }) => a.name.localeCompare(b.name))
                    );
                }
            } catch {
                // Fallback silently if offline
            }
        };
        loadProducts();
    }, []);

    const filterProductName = useMemo(() => {
        return availableProducts.find(p => p.id === filterProductId)?.name || '';
    }, [availableProducts, filterProductId]);

    // Auto-open detail modal if query param ?id=ORD-... matches
    useEffect(() => {
        if (!highlightId || !orders || orders.length === 0) return;
        const matched = orders.find(o => o.id === highlightId || o.id?.slice(-5)?.toUpperCase() === highlightId?.toUpperCase());
        if (matched) setSelectedOrder(matched);
    }, [highlightId, orders]);

    // ── Multi-Vector Search Predicate ──────────────────────────────────────────
    const matchesOrderSearch = useCallback((order: any, query: string) => {
        if (!query.trim()) return true;
        const q = query.trim().toLowerCase();

        // 1. Order ID
        const idMatches =
            order.id?.toLowerCase().includes(q) ||
            order.id?.slice(-5)?.toLowerCase().includes(q) ||
            `ord-${order.id?.slice(-5)?.toLowerCase()}`.includes(q);

        // 2. Customer fields
        const customerMatches =
            order.customer?.name?.toLowerCase().includes(q) ||
            order.customer?.phone?.toLowerCase().includes(q) ||
            order.customer?.email?.toLowerCase().includes(q) ||
            order.customer?.id?.toLowerCase().includes(q);

        // 3. Cashier/Staff fields
        const cashierMatches =
            order.cashier?.name?.toLowerCase().includes(q) ||
            order.cashier?.email?.toLowerCase().includes(q) ||
            order.cashier?.staffCode?.toLowerCase().includes(q) ||
            order.cashier?.id?.toLowerCase().includes(q);

        // 4. Branch/Store fields
        const storeMatches =
            order.store?.name?.toLowerCase().includes(q) ||
            order.store?.branchCode?.toLowerCase().includes(q) ||
            order.storeId?.toLowerCase().includes(q);

        // 5. Payment details
        const paymentMatches =
            order.paymentMethod?.toLowerCase().includes(q) ||
            order.paymentStatus?.toLowerCase().includes(q) ||
            order.status?.toLowerCase().includes(q) ||
            order.posDeviceType?.toLowerCase().includes(q);

        // 6. Terminal transaction references
        const terminalMatches =
            order.terminalTransaction?.transactionRef?.toLowerCase().includes(q) ||
            order.terminalTransaction?.paymentRef?.toLowerCase().includes(q);

        // 7. Order items (name, sku, barcode) + seat number
        const itemMatches = Array.isArray(order.items) && order.items.some((i: any) =>
            i.product?.name?.toLowerCase().includes(q) ||
            i.product?.sku?.toLowerCase().includes(q) ||
            i.product?.barcode?.toLowerCase().includes(q) ||
            i.seatNumber?.toLowerCase().includes(q)
        );

        // 8. Notes / reference fields
        const notesMatches = order.notes?.toLowerCase().includes(q);

        return idMatches || customerMatches || cashierMatches || storeMatches || paymentMatches || terminalMatches || itemMatches || notesMatches;
    }, []);

    // ── Dynamic Categories List (Displays category.name holding category.id) ────
    const availableCategories = useMemo(() => {
        const map = new Map<string, string>();
        fetchedCategories.forEach(c => {
            if (c.id) {
                map.set(c.id, c.name || 'Unnamed Category');
            }
        });
        (orders || []).forEach(o => {
            (o.items || []).forEach((i: any) => {
                const catId = i.product?.category?.id || i.product?.categoryId;
                const catName = i.product?.category?.name;
                if (catId && catName) {
                    map.set(catId, catName);
                }
            });
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [fetchedCategories, orders]);

    const availableBranches = useMemo(() => {
        const map = new Map<string, string>();
        (orders || []).forEach(o => {
            if (o.store?.id) {
                map.set(o.store.id, o.store.name || o.store.branchCode || o.store.id);
            } else if (o.storeId) {
                map.set(o.storeId, `Branch ${o.storeId.slice(0, 8)}`);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [orders]);

    const availableCashiers = useMemo(() => {
        const map = new Map<string, string>();
        (orders || []).forEach(o => {
            if (o.cashier?.id) {
                map.set(o.cashier.id, o.cashier.name || o.cashier.email || o.cashier.staffCode || o.cashier.id);
            } else if (o.cashierId) {
                map.set(o.cashierId, `Staff ${o.cashierId.slice(0, 8)}`);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [orders]);

    // ── Active Filters Chips (Built directly from URL Search Parameters) ───────
    const activeFilterChips = useMemo(() => {
        const chips: { id: string; label: string; onRemove: () => void }[] = [];

        // Search query chip
        if (searchQuery.trim()) {
            chips.push({ id: 'search-query', label: `Search: "${searchQuery.trim()}"`, onRemove: () => updateFilterParams({ q: null, search: null }) });
        }

        // Date chip
        if (dateMode === 'preset' && datePreset !== 'all') {
            const labels: Record<string, string> = {
                today: 'Date: Today',
                yesterday: 'Date: Yesterday',
                week: 'Date: Last 7 Days',
                month: 'Date: This Month',
                last30: 'Date: Last 30 Days'
            };
            chips.push({ id: 'date-preset', label: labels[datePreset] || `Date: ${datePreset}`, onRemove: () => updateFilterParams({ datePreset: null, dateMode: null }) });
        } else if (dateMode === 'single' && singleDate) {
            if (singleTimeMode === 'fullday') {
                chips.push({ id: 'date-single', label: `Date: ${singleDate}`, onRemove: () => updateFilterParams({ singleDate: null, datePreset: null, dateMode: null }) });
            } else if (singleTimeMode === 'exact' && exactTime) {
                chips.push({ id: 'date-exact', label: `Exact: ${singleDate} ${exactTime} (±${exactTolerance}m)`, onRemove: () => updateFilterParams({ singleDate: null, exactTime: null, datePreset: null, dateMode: null }) });
            } else if (singleTimeMode === 'custom' && (customStartTime || customEndTime)) {
                chips.push({ id: 'date-custom', label: `Time: ${singleDate} ${customStartTime || '00:00'}-${customEndTime || '23:59'}`, onRemove: () => updateFilterParams({ singleDate: null, customStartTime: null, customEndTime: null, datePreset: null, dateMode: null }) });
            } else {
                chips.push({ id: 'date-single', label: `Date: ${singleDate}`, onRemove: () => updateFilterParams({ singleDate: null, datePreset: null, dateMode: null }) });
            }
        } else if (dateMode === 'range' && (rangeStartDate || rangeEndDate)) {
            chips.push({ id: 'date-range', label: `Range: ${rangeStartDate || '...'} to ${rangeEndDate || '...'}`, onRemove: () => updateFilterParams({ startDate: null, endDate: null, rangeStartDate: null, rangeEndDate: null, datePreset: null, dateMode: null }) });
        }

        // Order Lifecycle Status
        if (selectedOrderStatus && selectedOrderStatus !== 'ALL') {
            const statusLabels: Record<string, string> = {
                COMPLETED: 'Completed',
                CANCELLED: 'Cancelled',
                REFUNDED: 'Refunded',
                PARTIALLY_REFUNDED: 'Partially Refunded',
                PENDING: 'Pending'
            };
            chips.push({ id: 'order-status', label: `Order: ${statusLabels[selectedOrderStatus] || selectedOrderStatus}`, onRemove: () => updateFilterParams({ orderStatus: null, status: null }) });
        }

        // Fulfillment Status
        if (selectedFulfillmentStatus && selectedFulfillmentStatus !== 'ALL') {
            const fulfillLabels: Record<string, string> = {
                NEW: 'New',
                IN_PREPARATION: 'In Preparation',
                READY_FOR_PICKUP: 'Ready for Pickup',
                DELIVERED: 'Delivered',
                SHIPPED: 'Shipped',
            };
            chips.push({ id: 'fulfillment-status', label: `Fulfillment: ${fulfillLabels[selectedFulfillmentStatus] || selectedFulfillmentStatus}`, onRemove: () => updateFilterParams({ fulfillmentStatus: null }) });
        }

        // Payment Status
        if (selectedPaymentStatus && selectedPaymentStatus !== 'ALL') {
            chips.push({ id: 'pay-status', label: `Payment: ${selectedPaymentStatus === 'SUCCESS' ? 'PAID' : selectedPaymentStatus}`, onRemove: () => updateFilterParams({ paymentStatus: null }) });
        }

        // Payment Method
        if (selectedPaymentMethod && selectedPaymentMethod !== 'ALL') {
            chips.push({ id: 'pay-method', label: `Method: ${selectedPaymentMethod}`, onRemove: () => updateFilterParams({ paymentMethod: null }) });
        }

        // Category
        if (filterCategoryId) {
            const catObj = availableCategories.find(c => c.id === filterCategoryId);
            chips.push({ id: 'category', label: `Category: ${catObj?.name || filterCategoryId}`, onRemove: () => updateFilterParams({ categoryId: null }) });
        }

        // Strict Product Filter
        if (filterProductId) {
            chips.push({ id: 'product-filter', label: `Product: "${filterProductName || filterProductId.slice(0, 8)}"`, onRemove: () => updateFilterParams({ productId: null }) });
        }

        // Branch
        if (selectedBranchId) {
            const branchObj = availableBranches.find(b => b.id === selectedBranchId);
            chips.push({ id: 'branch', label: `Branch: ${branchObj?.name || selectedBranchId}`, onRemove: () => updateFilterParams({ branchId: null, storeId: null }) });
        }

        // Cashier
        if (selectedCashierId) {
            const cashierObj = availableCashiers.find(c => c.id === selectedCashierId);
            chips.push({ id: 'cashier', label: `Staff: ${cashierObj?.name || selectedCashierId}`, onRemove: () => updateFilterParams({ staffId: null, cashierId: null }) });
        }

        // Item Name
        if (filterItemName.trim()) {
            chips.push({ id: 'item-name', label: `Item: "${filterItemName.trim()}"`, onRemove: () => updateFilterParams({ itemName: null }) });
        }

        // Total Amount
        if (filterMinTotal || filterMaxTotal) {
            chips.push({ id: 'order-total', label: `Total: ₦${filterMinTotal || '0'} - ₦${filterMaxTotal || '∞'}`, onRemove: () => updateFilterParams({ minTotal: null, maxTotal: null }) });
        }

        return chips;
    }, [
        dateMode, datePreset, singleDate, singleTimeMode, exactTime, exactTolerance, customStartTime, customEndTime,
        rangeStartDate, rangeEndDate, selectedOrderStatus, selectedFulfillmentStatus, selectedPaymentStatus, selectedPaymentMethod,
        filterCategoryId, filterProductId, filterProductName, selectedBranchId, selectedCashierId, filterItemName, filterMinTotal, filterMaxTotal,
        availableCategories, availableBranches, availableCashiers
    ]);

    const activeFilterCount = activeFilterChips.length;

    // Handle Date Preset Select Change
    const handleDateSelectChange = (val: string) => {
        if (val === 'single_day') {
            const now = new Date();
            const dStr = singleDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            updateFilterParams({
                dateMode: 'single',
                datePreset: 'single_day',
                singleDate: dStr,
                startDate: null,
                endDate: null,
                rangeStartDate: null,
                rangeEndDate: null
            });
        } else if (val === 'custom_range') {
            updateFilterParams({
                dateMode: 'range',
                datePreset: 'custom_range',
                singleDate: null,
                exactTime: null,
                customStartTime: null,
                customEndTime: null
            });
        } else {
            updateFilterParams({
                dateMode: 'preset',
                datePreset: val,
                singleDate: null,
                startDate: null,
                endDate: null,
                rangeStartDate: null,
                rangeEndDate: null,
                exactTime: null,
                customStartTime: null,
                customEndTime: null
            });
        }
    };

    // ── Filtered Orders Memo ───────────────────────────────────────────────────
    const filteredOrders = useMemo(() => {
        return (orders || []).filter(order => {
            // 1. Text search
            if (!matchesOrderSearch(order, searchQuery)) return false;

            // 2. Date filtering
            const orderDate = new Date(order.createdAt);
            const now = new Date();

            if (dateMode === 'preset') {
                if (datePreset === 'today') {
                    if (orderDate.toDateString() !== now.toDateString()) return false;
                } else if (datePreset === 'yesterday') {
                    const y = new Date(now);
                    y.setDate(y.getDate() - 1);
                    if (orderDate.toDateString() !== y.toDateString()) return false;
                } else if (datePreset === 'week') {
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    if (orderDate < weekAgo) return false;
                } else if (datePreset === 'last30') {
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    if (orderDate < thirtyDaysAgo) return false;
                } else if (datePreset === 'month') {
                    if (orderDate.getMonth() !== now.getMonth() || orderDate.getFullYear() !== now.getFullYear()) return false;
                }
            } else if (dateMode === 'single') {
                if (singleDate) {
                    const orderLocalYear = orderDate.getFullYear();
                    const orderLocalMonth = String(orderDate.getMonth() + 1).padStart(2, '0');
                    const orderLocalDate = String(orderDate.getDate()).padStart(2, '0');
                    const orderDateStr = `${orderLocalYear}-${orderLocalMonth}-${orderLocalDate}`;

                    if (orderDateStr !== singleDate) return false;

                    if (singleTimeMode === 'exact' && exactTime) {
                        const [targetH, targetM] = exactTime.split(':').map(Number);
                        const targetMinutes = targetH * 60 + targetM;
                        const orderMinutes = orderDate.getHours() * 60 + orderDate.getMinutes();
                        if (Math.abs(orderMinutes - targetMinutes) > exactTolerance) return false;
                    } else if (singleTimeMode === 'custom') {
                        const orderMinutes = orderDate.getHours() * 60 + orderDate.getMinutes();
                        if (customStartTime) {
                            const [startH, startM] = customStartTime.split(':').map(Number);
                            if (orderMinutes < startH * 60 + startM) return false;
                        }
                        if (customEndTime) {
                            const [endH, endM] = customEndTime.split(':').map(Number);
                            if (orderMinutes > endH * 60 + endM) return false;
                        }
                    }
                }
            } else if (dateMode === 'range') {
                if (rangeStartDate) {
                    const start = new Date(rangeStartDate + 'T00:00:00');
                    if (orderDate < start) return false;
                }
                if (rangeEndDate) {
                    const end = new Date(rangeEndDate + 'T23:59:59.999');
                    if (orderDate > end) return false;
                }
            }

            // 3. Order Lifecycle Status filter (COMPLETED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED, PENDING)
            if (selectedOrderStatus && selectedOrderStatus !== 'ALL') {
                const targetStatus = selectedOrderStatus.toUpperCase();
                const orderStatus = (order.status || '').toUpperCase();
                const paymentStatus = (order.paymentStatus || '').toUpperCase();

                if (targetStatus === 'COMPLETED') {
                    const isCompleted = orderStatus === 'COMPLETED' || 
                        ((paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') && orderStatus !== 'CANCELLED' && paymentStatus !== 'REFUNDED' && orderStatus !== 'REFUNDED');
                    if (!isCompleted) return false;
                } else if (targetStatus === 'REFUNDED') {
                    const isRefunded = orderStatus === 'REFUNDED' || paymentStatus === 'REFUNDED' || Boolean(order.refund);
                    if (!isRefunded) return false;
                } else if (targetStatus === 'CANCELLED') {
                    const isCancelled = orderStatus === 'CANCELLED' || paymentStatus === 'CANCELLED';
                    if (!isCancelled) return false;
                } else if (targetStatus === 'PARTIALLY_REFUNDED') {
                    const isPartiallyRefunded = orderStatus === 'PARTIALLY_REFUNDED' || paymentStatus === 'PARTIALLY_REFUNDED';
                    if (!isPartiallyRefunded) return false;
                } else if (targetStatus === 'PENDING') {
                    const isPending = orderStatus === 'PENDING' || (paymentStatus === 'PENDING' && orderStatus !== 'CANCELLED');
                    if (!isPending) return false;
                } else {
                    if (orderStatus !== targetStatus && paymentStatus !== targetStatus) return false;
                }
            }

            // 4. Fulfillment Status filter (NEW, IN_PREPARATION, READY_FOR_PICKUP, DELIVERED, SHIPPED)
            if (selectedFulfillmentStatus && selectedFulfillmentStatus !== 'ALL') {
                const targetFulfill = selectedFulfillmentStatus.toUpperCase();
                const orderStatus = (order.status || '').toUpperCase();

                if (targetFulfill === 'READY_FOR_PICKUP' || targetFulfill === 'READY') {
                    if (orderStatus !== 'READY' && orderStatus !== 'READY_FOR_PICKUP') return false;
                } else if (targetFulfill === 'IN_PREPARATION' || targetFulfill === 'PREPARING') {
                    if (orderStatus !== 'IN_PREPARATION' && orderStatus !== 'PREPARING') return false;
                } else {
                    if (orderStatus !== targetFulfill) return false;
                }
            }

            // 5. Payment Status filter
            if (selectedPaymentStatus && selectedPaymentStatus !== 'ALL') {
                if (order.paymentStatus !== selectedPaymentStatus) return false;
            }

            // 6. Payment Method filter
            if (selectedPaymentMethod && selectedPaymentMethod !== 'ALL') {
                if (order.paymentMethod !== selectedPaymentMethod) return false;
            }

            // 7. Product Category filter (Checks category.id or categoryId or category.name)
            if (filterCategoryId) {
                const hasCat = Array.isArray(order.items) && order.items.some((i: any) =>
                    i.product?.categoryId === filterCategoryId ||
                    i.product?.category?.id === filterCategoryId ||
                    i.product?.category?.name === filterCategoryId
                );
                if (!hasCat) return false;
            }

            // 8. Strict Product ID exact-match filter
            if (filterProductId) {
                const hasProduct = Array.isArray(order.items) && order.items.some((i: any) =>
                    i.productId === filterProductId || i.product?.id === filterProductId
                );
                if (!hasProduct) return false;
            }

            // 9. Store / Branch filter
            if (selectedBranchId && selectedBranchId !== 'ALL' && selectedBranchId !== 'all') {
                if (order.storeId !== selectedBranchId && order.store?.id !== selectedBranchId) {
                    return false;
                }
            }

            // 10. Staff / Cashier filter
            if (selectedCashierId && order.cashierId !== selectedCashierId && order.cashier?.id !== selectedCashierId) {
                return false;
            }

            // 11. Item Name / SKU
            if (filterItemName.trim()) {
                const term = filterItemName.trim().toLowerCase();
                const hasItem = Array.isArray(order.items) && order.items.some((i: any) =>
                    i.product?.name?.toLowerCase().includes(term) ||
                    i.product?.sku?.toLowerCase().includes(term) ||
                    i.product?.barcode?.toLowerCase().includes(term)
                );
                if (!hasItem) return false;
            }

            // 12. Financial Amount Range
            if (filterMinTotal && Number(order.totalAmount) < Number(filterMinTotal)) return false;
            if (filterMaxTotal && Number(order.totalAmount) > Number(filterMaxTotal)) return false;

            return true;
        });
    }, [
        orders, searchQuery, dateMode, datePreset, singleDate, singleTimeMode, exactTime, exactTolerance,
        customStartTime, customEndTime, rangeStartDate, rangeEndDate, selectedOrderStatus, selectedFulfillmentStatus,
        selectedPaymentStatus, selectedPaymentMethod, filterCategoryId, filterProductId, selectedBranchId, selectedCashierId,
        filterItemName, filterMinTotal, filterMaxTotal, matchesOrderSearch
    ]);

    const downloadCSV = () => {
        const headers = ['Order ID', 'Date', 'Customer', 'Cashier', 'Amount', 'Method', 'Status'];
        const rows = filteredOrders.map(o => [
            `ORD-${o.id.slice(-5).toUpperCase()}`,
            new Date(o.createdAt).toLocaleString(),
            o.customer?.name || 'Walk-in',
            o.cashier?.name || 'System',
            o.totalAmount,
            o.paymentMethod,
            o.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleResumeDraft = async (draftOrder: any) => {
        if (lockDraftOrder) {
            try { await lockDraftOrder(draftOrder.id); } catch {}
        }
        navigate('/pos', { state: { resumedDraft: draftOrder } });
    };

    const handleCancelDraft = async (draftId: string) => {
        setDeleteLoading(true);
        try {
            if (cancelDraftOrder) await cancelDraftOrder(draftId);
            if (refresh) refresh();
            showToast('Draft order cancelled and inventory restored.', 'success');
        } catch {
            showToast('Failed to cancel draft. Please try again.', 'error');
        } finally {
            setDeleteLoading(false);
            setDraftToDelete(null);
        }
    };

    const handleClearAllDrafts = async () => {
        setDeleteLoading(true);
        try {
            const token = localStorage.getItem('token');
            const storeId = selectedBranchId || undefined;
            await axios.delete(`${API_URL}/orders/drafts/all`, {
                params: { storeId, branchId: storeId },
                headers: { Authorization: `Bearer ${token}` }
            });
            if (refresh) refresh();
            showToast('All draft orders cleared and stock restored successfully.', 'success');
        } catch {
            showToast('Failed to clear all drafts. Please try again.', 'error');
        } finally {
            setDeleteLoading(false);
            setBulkDeleteConfirm(false);
        }
    };

    const handleRefundOrder = async () => {
        if (!refundTarget || !refundReason.trim()) return;
        setRefundLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/orders/${refundTarget.id}/refund`,
                { reason: refundReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast(`Refund issued for ORD-${refundTarget.id.slice(-5).toUpperCase()}. Stock restored.`, 'success');
            setRefundTarget(null);
            setRefundReason('');
            setSelectedOrder(null);
            if (refresh) refresh();
        } catch (err: any) {
            showToast(err?.response?.data?.message || 'Failed to process refund.', 'error');
        } finally {
            setRefundLoading(false);
        }
    };

    // Filtered list based on active main tab
    const displayList = useMemo(() => {
        const sourceList = mainTab === 'drafts' ? (draftOrders || []) : filteredOrders;
        if (mainTab === 'drafts') {
            return sourceList.filter(o => matchesOrderSearch(o, searchQuery));
        }
        return sourceList;
    }, [mainTab, draftOrders, filteredOrders, searchQuery, matchesOrderSearch]);

    // ── Real-Time Dynamic Financial Summary Metrics ────────────────────────────
    const financialSummary = useMemo(() => {
        let totalRevenue = 0;
        const totalCount = displayList.length;
        let paidCount = 0;
        let pendingCount = 0;
        let refundedCount = 0;
        let productUnitsSold = 0;
        let productRevenue = 0;

        const targetProdId = filterProductId?.trim();
        const targetItemText = filterItemName?.trim()?.toLowerCase();

        displayList.forEach(order => {
            const amt = Number(order.totalAmount || 0);
            totalRevenue += amt;

            const pStatus = (order.paymentStatus || '').toUpperCase();
            const oStatus = (order.status || '').toUpperCase();

            if (pStatus === 'SUCCESS' || pStatus === 'PAID' || oStatus === 'COMPLETED') {
                paidCount++;
            } else if (pStatus === 'REFUNDED' || oStatus === 'REFUNDED') {
                refundedCount++;
            } else {
                pendingCount++;
            }

            if (Array.isArray(order.items)) {
                order.items.forEach((item: any) => {
                    const matchesProduct = targetProdId ? (item.productId === targetProdId || item.product?.id === targetProdId) : false;
                    const matchesItemText = targetItemText ? (
                        item.product?.name?.toLowerCase().includes(targetItemText) ||
                        item.product?.sku?.toLowerCase().includes(targetItemText) ||
                        item.product?.barcode?.toLowerCase().includes(targetItemText)
                    ) : false;

                    if (matchesProduct || matchesItemText) {
                        const qty = Number(item.quantity || 0);
                        const price = Number(item.price || 0);
                        productUnitsSold += qty;
                        productRevenue += price * qty;
                    }
                });
            }
        });

        // When in drafts tab, dynamically compute paid vs pending counts across branch context
        if (mainTab === 'drafts') {
            const paidFromOrders = filteredOrders.filter(o => {
                const p = (o.paymentStatus || '').toUpperCase();
                const s = (o.status || '').toUpperCase();
                return p === 'SUCCESS' || p === 'PAID' || s === 'COMPLETED';
            }).length;
            paidCount = paidFromOrders;
            pendingCount = displayList.length;
        }

        const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;

        return {
            totalRevenue,
            totalCount,
            paidCount,
            pendingCount,
            refundedCount,
            avgTicket,
            productUnitsSold,
            productRevenue,
            isProductFiltered: Boolean(targetProdId || targetItemText)
        };
    }, [mainTab, displayList, filteredOrders, filterProductId, filterItemName]);

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* ── Top Header & Tab Controls ── */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Transaction Archives</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Review, multi-vector search, filter and export sales & hold orders</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Main Tab Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button
                            onClick={() => updateFilterParams({ tab: 'all' })}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Tag size={14} />
                            All Sales ({(orders || []).length})
                        </button>
                        <button
                            onClick={() => updateFilterParams({ tab: 'drafts' })}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'drafts' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Clock size={14} />
                            Hold / Drafts ({(draftOrders || []).length})
                        </button>
                    </div>

                    <button
                        onClick={downloadCSV}
                        className="p-2.5 px-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2 font-black text-xs uppercase tracking-wider"
                    >
                        <Download size={15} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ── Reference Design: Clean Horizontal Inline Filter Bar (Directly Above Data Content) ── */}
            {mainTab === 'all' && (
                <div className="space-y-2">
                    {/* Filter Row: Sequential inline elements aligned to the left with uniform gap */}
                    <div className="flex flex-wrap items-center gap-2 py-1">
                        {/* 1. Date Range Dropdown / Selector */}
                        <div className="relative">
                            <select
                                value={datePreset}
                                onChange={(e) => handleDateSelectChange(e.target.value)}
                                className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer transition-all hover:border-gray-300 dark:hover:border-gray-600"
                            >
                                <option value="all">All Dates</option>
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">This Month</option>
                                <option value="last30">Last 30 Days</option>
                                <option value="single_day">Single Day & Time</option>
                                <option value="custom_range">Custom Date Range</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Inline Granular Date Inputs if Single Day Mode */}
                        {dateMode === 'single' && (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => updateFilterParams({ singleDate: e.target.value })}
                                    className="h-10 px-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-gray-900"
                                />
                                <select
                                    value={singleTimeMode}
                                    onChange={(e) => updateFilterParams({ singleTimeMode: e.target.value })}
                                    className="h-10 px-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                >
                                    <option value="fullday">Full 24h</option>
                                    <option value="exact">Exact Time</option>
                                    <option value="custom">Time Range</option>
                                </select>
                                {singleTimeMode === 'exact' && (
                                    <input
                                        type="time"
                                        value={exactTime}
                                        onChange={(e) => updateFilterParams({ exactTime: e.target.value })}
                                        className="h-10 px-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                    />
                                )}
                                {singleTimeMode === 'custom' && (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="time"
                                            value={customStartTime}
                                            onChange={(e) => updateFilterParams({ customStartTime: e.target.value })}
                                            className="h-10 px-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                        <span className="text-xs text-gray-400 font-bold">-</span>
                                        <input
                                            type="time"
                                            value={customEndTime}
                                            onChange={(e) => updateFilterParams({ customEndTime: e.target.value })}
                                            className="h-10 px-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Inline Granular Date Inputs if Multi-Day Range Mode */}
                        {dateMode === 'range' && (
                            <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                                <input
                                    type="date"
                                    value={rangeStartDate}
                                    placeholder="Start Date"
                                    onChange={(e) => updateFilterParams({ startDate: e.target.value, rangeStartDate: null })}
                                    className="h-10 px-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-gray-900"
                                />
                                <span className="text-xs text-gray-400 font-bold">to</span>
                                <input
                                    type="date"
                                    value={rangeEndDate}
                                    placeholder="End Date"
                                    onChange={(e) => updateFilterParams({ endDate: e.target.value, rangeEndDate: null })}
                                    className="h-10 px-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-gray-900"
                                />
                            </div>
                        )}

                        {/* 2. Search by Keyword / Order ID / Customer / Staff */}
                        <div className="relative flex-1 min-w-[200px] max-w-[280px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                                type="text"
                                placeholder="Search by keyword, ID..."
                                className="w-full h-10 pl-9 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => updateFilterParams({ q: e.target.value, search: null })}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => updateFilterParams({ q: null, search: null })}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-md"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* 3. Order Lifecycle Status Selector */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={selectedOrderStatus}
                                    onChange={(e) => updateFilterParams({ orderStatus: e.target.value, status: null })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                >
                                    <option value="ALL">Order Status</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="CANCELLED">Cancelled</option>
                                    <option value="REFUNDED">Refunded</option>
                                    <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 3b. Fulfillment Status Selector */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={selectedFulfillmentStatus}
                                    onChange={(e) => updateFilterParams({ fulfillmentStatus: e.target.value })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                >
                                    <option value="ALL">Fulfillment Status</option>
                                    <option value="NEW">New</option>
                                    <option value="IN_PREPARATION">In Preparation</option>
                                    <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="SHIPPED">Shipped</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 4. Payment Status Selector */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={selectedPaymentStatus}
                                    onChange={(e) => updateFilterParams({ paymentStatus: e.target.value })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                >
                                    <option value="ALL">Payment Status</option>
                                    <option value="SUCCESS">Paid / Success</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="IN_CHECKOUT">In Checkout</option>
                                    <option value="FAILED">Failed</option>
                                    <option value="REFUNDED">Refunded</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 5. Payment Method Selector */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={selectedPaymentMethod}
                                    onChange={(e) => updateFilterParams({ paymentMethod: e.target.value })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600"
                                >
                                    <option value="ALL">Payment Method</option>
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card (POS)</option>
                                    <option value="TRANSFER">Transfer</option>
                                    <option value="WALLET">Wallet</option>
                                    <option value="SPLIT">Split</option>
                                    <option value="CREDIT">Credit</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 6. Product Category Selector (Renders category.name holding category.id) */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={filterCategoryId}
                                    onChange={(e) => updateFilterParams({ categoryId: e.target.value })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 max-w-[160px] truncate"
                                >
                                    <option value="">Product Category</option>
                                    {availableCategories.map(category => (
                                         <option key={category.id} value={category.id}>
                                            {category.name || 'Unnamed Category'}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 6b. Strict Product Filter Dropdown */}
                        {showFilters && (
                            <div className="relative">
                                <select
                                    value={filterProductId}
                                    onChange={(e) => updateFilterParams({ productId: e.target.value })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 max-w-[180px] truncate"
                                >
                                    <option value="">Filter by Product</option>
                                    {availableProducts.map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 7. Branch Selector */}
                        {showFilters && availableBranches.length > 1 && (
                            <div className="relative">
                                <select
                                    value={selectedBranchId}
                                    onChange={(e) => updateFilterParams({ branchId: e.target.value, storeId: null })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 max-w-[150px] truncate"
                                >
                                    <option value="">All Branches</option>
                                    {availableBranches.map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* 8. Staff Selector */}
                        {showFilters && availableCashiers.length > 1 && (
                            <div className="relative">
                                <select
                                    value={selectedCashierId}
                                    onChange={(e) => updateFilterParams({ staffId: e.target.value, cashierId: null })}
                                    className="h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs text-gray-900 dark:text-white outline-none focus:border-gray-900 dark:focus:border-gray-400 shadow-sm appearance-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 max-w-[140px] truncate"
                                >
                                    <option value="">All Staff</option>
                                    {availableCashiers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        )}

                        {/* Far Right Control: "Hide filters" / "Show filters" button */}
                        <div className="ml-auto flex items-center gap-2">
                            {activeFilterCount > 0 && (
                                <button
                                    onClick={clearAllFilters}
                                    className="h-10 px-3 text-xs font-black text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors uppercase tracking-wider"
                                >
                                    Reset
                                </button>
                            )}

                            <button
                                onClick={() => setShowFilters(prev => !prev)}
                                className={`h-10 px-3.5 rounded-xl border font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm ${
                                    !showFilters
                                        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white'
                                        : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Filter size={14} />
                                <span>{showFilters ? 'Hide filters' : 'Show filters'}</span>
                                {activeFilterCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-white">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ── Active Filter Chips Bar ── */}
                    {activeFilterChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 pr-1">
                                Filters:
                            </span>
                            {activeFilterChips.map(chip => (
                                <span
                                    key={chip.id}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                                >
                                    <span>{chip.label}</span>
                                    <button
                                        onClick={chip.onRemove}
                                        className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-red-500 rounded transition-colors"
                                        title="Remove filter"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <button
                                onClick={clearAllFilters}
                                className="text-[11px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-0.5 transition-colors underline"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Draft Tab: Dedicated Search Bar ── */}
            {mainTab === 'drafts' && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                    <div className="w-8 h-8 flex items-center justify-center bg-amber-100 dark:bg-amber-900/50 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                        <Search size={15} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => updateFilterParams({ q: e.target.value || null })}
                        placeholder="Search drafts by ID, customer, cashier, item name, or seat #..."
                        className="flex-1 min-w-[200px] bg-transparent text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-amber-700/60 outline-none"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => updateFilterParams({ q: null })}
                            className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-500 hover:text-amber-700 transition-colors"
                            title="Clear search"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 shrink-0">
                        {displayList.length} Draft{displayList.length !== 1 ? 's' : ''}
                    </span>
                    {(draftOrders || []).length > 0 && (
                        <button
                            onClick={() => setBulkDeleteConfirm(true)}
                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shrink-0 ml-auto sm:ml-0"
                            title="Clear all active drafts"
                        >
                            <Trash2 size={13} />
                            <span>Clear All ({(draftOrders || []).length})</span>
                        </button>
                    )}
                </div>
            )}

            {/* ── Context-Aware Financial Summary Strip ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Total Revenue / Pipeline Value */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                            {mainTab === 'drafts' ? 'Draft Pipeline Value' : 'Total Revenue'}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CreditCard size={14} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            ₦{financialSummary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                            <span>Avg: ₦{financialSummary.avgTicket.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/order</span>
                        </div>
                    </div>
                </div>

                {/* 2. Order Volume & Breakdown */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">
                            {mainTab === 'drafts' ? 'Hold Orders Count' : 'Total Order Volume'}
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Package size={14} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {financialSummary.totalCount.toLocaleString()} {mainTab === 'drafts' ? 'Drafts' : 'Orders'}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-green-600 dark:text-green-400 font-black">{financialSummary.paidCount} Paid</span>
                            {financialSummary.pendingCount > 0 && <span className="text-amber-600 dark:text-amber-400 font-black">· {financialSummary.pendingCount} Pending</span>}
                            {financialSummary.refundedCount > 0 && <span className="text-red-600 dark:text-red-400 font-black">· {financialSummary.refundedCount} Refunded</span>}
                        </div>
                    </div>
                </div>

                {/* 3. Average Order Value */}
                <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50/40 dark:from-purple-950/20 dark:to-fuchsia-950/10 border border-purple-100 dark:border-purple-900/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-400">
                            Average Ticket Size
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Tag size={14} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            ₦{financialSummary.avgTicket.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                            <span>Per transaction average</span>
                        </div>
                    </div>
                </div>

                {/* 4. Product Metric (Conditional if product/item filter active) OR Branch Context Pill */}
                {financialSummary.isProductFiltered ? (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between ring-2 ring-amber-400/30 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 truncate max-w-[130px]" title={filterProductName || filterItemName}>
                                {filterProductName || filterItemName || 'Product Filter'}
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                <Package size={14} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-200 tracking-tight">
                                {financialSummary.productUnitsSold} Units Sold
                            </div>
                            <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                                <span>₦{financialSummary.productRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} product total</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50/40 dark:from-slate-800/40 dark:to-slate-800/20 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                Active Context
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-gray-200 dark:bg-slate-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                                <Clock size={14} />
                            </div>
                        </div>
                        <div className="mt-2">
                            <div className="text-sm font-black text-gray-900 dark:text-white truncate" title={selectedBranchId ? (availableBranches.find(b => b.id === selectedBranchId)?.name || selectedBranchId) : 'All Branches'}>
                                {selectedBranchId ? (availableBranches.find(b => b.id === selectedBranchId)?.name || 'Filtered Branch') : 'All Branches'}
                            </div>
                            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                <span>{datePreset !== 'all' ? `Preset: ${datePreset}` : 'All Date Archives'}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Main Data Table ── */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                                <th className="px-8 py-5">Order Reference</th>
                                <th className="px-8 py-5">Time & Stakeholders</th>
                                <th className="px-8 py-5">Fiscal Details</th>
                                <th className="px-8 py-5">Fulfillment & Payment</th>
                                <th className="px-8 py-5 text-right">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-bold animate-pulse uppercase tracking-[0.2em]">Synchronizing Archives...</td></tr>
                            ) : displayList.length === 0 ? (
                                <tr><td colSpan={5} className="px-8 py-24 text-center text-gray-400 font-bold italic">
                                    {mainTab === 'drafts' ? 'No active hold or draft orders found.' : 'No matching records found.'}
                                </td></tr>
                            ) : displayList.map(order => (
                                <tr
                                    key={order.id}
                                    id={`order-${order.id}`}
                                    className={`group transition-all ${order.id === highlightId
                                            ? 'bg-green-50 dark:bg-green-950/20 ring-2 ring-inset ring-[#2D7A3E]/30 animate-pulse-subtle'
                                            : 'hover:bg-gray-50/30 dark:hover:bg-slate-800/40'
                                        }`}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-gray-900 transition-all">
                                                <Tag size={18} />
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900 dark:text-white text-sm">ORD-{order.id.slice(-5).toUpperCase()}</div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                                                    <UserIcon size={10} />
                                                    Cashier: {order.cashier?.name || 'System Operator'}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                                                <UserIcon size={14} className="text-gray-400" />
                                                <span>{order.customer?.name || 'Walk-in Customer'}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar size={10} />
                                                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="font-black text-gray-900 dark:text-white text-sm">₦{Number(order.totalAmount).toLocaleString()}</div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-500 uppercase mt-1 tracking-tighter">
                                            <CreditCard size={12} />
                                            {order.paymentMethod}
                                        </div>
                                        {/* Seat number badges for drafts */}
                                        {mainTab === 'drafts' && Array.isArray(order.items) && order.items.some((i: any) => i.seatNumber) && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {order.items.filter((i: any) => i.seatNumber).map((i: any) => (
                                                    <span key={i.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded-md uppercase tracking-wider">
                                                        Seat {i.seatNumber}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {/* Fulfillment Status */}
                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${order.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400' :
                                                    order.status === 'READY' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400' :
                                                        'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'COMPLETED' ? 'bg-green-500' :
                                                        order.status === 'READY' ? 'bg-blue-500' :
                                                            'bg-amber-500'
                                                    }`}></div>
                                                FUL: {order.status}
                                            </span>
                                            {/* Payment Status */}
                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${order.paymentStatus === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400' :
                                                    order.paymentStatus === 'IN_CHECKOUT' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-400' :
                                                    order.paymentStatus === 'DRAFT' ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400' :
                                                        'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${order.paymentStatus === 'SUCCESS' ? 'bg-green-500' :
                                                        order.paymentStatus === 'IN_CHECKOUT' ? 'bg-purple-500' :
                                                            'bg-amber-500'
                                                    }`}></div>
                                                PAY: {order.paymentStatus || 'PENDING'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {mainTab === 'drafts' ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleResumeDraft(order)}
                                                    className="px-3 py-1.5 bg-[#2D7A3E] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#20502E] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                                                    title="Resume checkout in POS"
                                                >
                                                    <Play size={12} /> Resume
                                                </button>
                                                <button
                                                    onClick={() => setDraftToDelete(order)}
                                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-xl transition-colors"
                                                    title="Cancel Draft Order"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
                                            >
                                                <ArrowRight size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredOrders.length > 0 && (
                    <div className="p-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        <span>Viewing {filteredOrders.length} of {orders.length} Global Records</span>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-900 dark:text-white font-bold">Page 01</span>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Order Details Modal ── */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-[101] overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Transaction Details</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Ref: ORD-{selectedOrder.id.slice(-5).toUpperCase()} • {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-2xl text-gray-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Customer Info</p>
                                    <p className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <UserIcon size={14} className="text-gray-400" />
                                        {selectedOrder.customer?.name || 'Walk-in Customer'}
                                    </p>
                                    {selectedOrder.customer?.phone && (
                                        <p className="text-xs font-bold text-gray-500 mt-1">{selectedOrder.customer.phone}</p>
                                    )}
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Operator</p>
                                    <p className="font-black text-gray-900 dark:text-white flex items-center gap-2">
                                        <UserIcon size={14} className="text-gray-400" />
                                        {selectedOrder.cashier?.name || 'System Operator'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <Package size={14} /> Itemized Bill
                                    {filterProductId && (
                                        <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-full border border-amber-200 dark:border-amber-800 uppercase tracking-wider">
                                            Showing filtered item only
                                        </span>
                                    )}
                                </h3>
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black">
                                            <tr>
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3">Seat #</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3 text-right">Unit Price</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-sm">
                                            {(filterProductId
                                                ? (selectedOrder.items?.filter((item: any) =>
                                                    item.productId === filterProductId || item.product?.id === filterProductId
                                                ) ?? [])
                                                : (selectedOrder.items ?? [])
                                            ).map((item: any) => (
                                                <tr key={item.id} className={`font-bold text-gray-900 dark:text-gray-200 ${
                                                    filterProductId && (item.productId === filterProductId || item.product?.id === filterProductId)
                                                        ? 'bg-amber-50/60 dark:bg-amber-950/20'
                                                        : ''
                                                }`}>
                                                    <td className="px-4 py-3">{item.product?.name || `Product ID: ${item.productId?.slice(0, 8)}...`}</td>
                                                    <td className="px-4 py-3">
                                                        {item.seatNumber ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded-md uppercase tracking-wider">
                                                                Seat {item.seatNumber}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right">₦{Number(item.price).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right">₦{(Number(item.price) * item.quantity).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-slate-800/60 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Method & Payment</p>
                                    <div className="flex gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black rounded-full uppercase tracking-widest">
                                            <CreditCard size={12} /> {selectedOrder.paymentMethod}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full border uppercase tracking-widest ${selectedOrder.paymentStatus === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400' :
                                                selectedOrder.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400' :
                                                    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                                            }`}>
                                            PAY: {selectedOrder.paymentStatus || 'PENDING'}
                                        </span>
                                    </div>
                                    {selectedOrder.posDeviceType && (
                                        <div className="mt-2 text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 bg-gray-200/60 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                                            Device: {selectedOrder.posDeviceType}
                                        </div>
                                    )}
                                    {selectedOrder.terminalTransaction && (
                                        <div className="mt-2 text-[10px] font-mono font-bold text-green-700 dark:text-green-400 bg-green-100/60 dark:bg-green-950/30 px-2.5 py-1 rounded-lg">
                                            Monnify Ref: {selectedOrder.terminalTransaction.transactionRef}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Fulfillment</p>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full border uppercase tracking-widest ${selectedOrder.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400' :
                                            selectedOrder.status === 'READY' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-400' :
                                                'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400'
                                        }`}>
                                        FUL: {selectedOrder.status}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Total Amount</p>
                                    <p className="text-3xl font-black text-[#8B1538]">₦{Number(selectedOrder.totalAmount).toLocaleString()}</p>
                                </div>
                            </div>
                            {/* Refund Button (only for SUCCESS/PAID orders) */}
                            {(selectedOrder.paymentStatus === 'SUCCESS' || selectedOrder.paymentStatus === 'PAID') && (
                                <div className="px-8 pb-6">
                                    <button
                                        onClick={() => { setRefundTarget(selectedOrder); setSelectedOrder(null); }}
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 font-black rounded-2xl border border-red-200 dark:border-red-800 transition-all text-sm uppercase tracking-widest"
                                    >
                                        <RotateCcw size={16} /> Issue Refund
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast Notification ── */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm animate-in slide-in-from-bottom-4 duration-300 ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    {toast.message}
                </div>
            )}

            {/* ── Draft Delete Confirmation Modal ── */}
            {draftToDelete && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Cancel Draft Order?</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    ORD-{draftToDelete.id.slice(-5).toUpperCase()} — Items will be returned to inventory.
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
                            ⚠️ This action is permanent and cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDraftToDelete(null)}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Keep Draft
                            </button>
                            <button
                                onClick={() => handleCancelDraft(draftToDelete.id)}
                                disabled={deleteLoading}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-2xl font-black transition-all"
                            >
                                {deleteLoading ? 'Cancelling...' : 'Yes, Cancel Draft'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Drafts Delete Confirmation Modal ── */}
            {bulkDeleteConfirm && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center shrink-0">
                                <Trash2 size={24} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Clear All Draft Orders?</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Permanently delete {(draftOrders || []).length} active hold order{(draftOrders || []).length !== 1 ? 's' : ''}.
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-800 rounded-2xl p-4">
                            ⚠️ All items from all held drafts will be immediately returned to inventory stock. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setBulkDeleteConfirm(false)}
                                disabled={deleteLoading}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearAllDrafts}
                                disabled={deleteLoading}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-2xl font-black transition-all"
                            >
                                {deleteLoading ? 'Clearing...' : `Clear ${(draftOrders || []).length} Drafts`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Refund Modal ── */}
            {refundTarget && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center shrink-0">
                                    <RotateCcw size={24} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Issue Refund</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ORD-{refundTarget.id.slice(-5).toUpperCase()} · ₦{Number(refundTarget.totalAmount).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setRefundTarget(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-2xl p-4">
                            ⚠️ This will mark the order as <span className="font-black">REFUNDED</span> and restore all item stock. This cannot be undone.
                        </p>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Refund Reason (Required)</label>
                            <textarea
                                rows={3}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:border-red-400 outline-none resize-none"
                                placeholder="e.g. Customer returned item, damaged goods..."
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setRefundTarget(null); setRefundReason(''); }}
                                className="flex-1 py-3 border border-gray-200 dark:border-gray-700 rounded-2xl font-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRefundOrder}
                                disabled={refundLoading || !refundReason.trim()}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-2xl font-black transition-all"
                            >
                                {refundLoading ? 'Processing...' : 'Confirm Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersPage;
