import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Search, Download, Calendar, ArrowRight, User as UserIcon, Tag, CreditCard,
    ChevronDown, ChevronUp, X, Package, Clock, Play, Trash2, RotateCcw,
    AlertTriangle, CheckCircle, SlidersHorizontal, Check
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../../lib/apiConfig';

interface OrdersPageProps {
    orders: any[];
    draftOrders?: any[];
    isLoading: boolean;
    refresh?: () => void;
    fetchDraftOrders?: () => Promise<void>;
    cancelDraftOrder?: (id: string) => Promise<void>;
    lockDraftOrder?: (id: string) => Promise<any>;
}

type DateMode = 'preset' | 'single' | 'range';
type SingleTimeMode = 'fullday' | 'exact' | 'custom';

const OrdersPage = ({ orders, draftOrders = [], isLoading, refresh, cancelDraftOrder, lockDraftOrder }: OrdersPageProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [mainTab, setMainTab] = useState<'all' | 'drafts'>('all'); // 'all' or 'drafts'
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const highlightId = queryParams.get('id');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    // ── Filter Panel Collapsible State ─────────────────────────────────────────
    const [filterPanelOpen, setFilterPanelOpen] = useState(false);

    // ── Granular Date & Time Selection ─────────────────────────────────────────
    const [dateMode, setDateMode] = useState<DateMode>('preset');
    const [datePreset, setDatePreset] = useState<string>('all'); // all, today, yesterday, week, month, last30
    const [singleDate, setSingleDate] = useState<string>(''); // YYYY-MM-DD
    const [singleTimeMode, setSingleTimeMode] = useState<SingleTimeMode>('fullday');
    const [exactTime, setExactTime] = useState<string>(''); // HH:mm
    const [exactTolerance, setExactTolerance] = useState<number>(15); // +/- 15 min tolerance
    const [customStartTime, setCustomStartTime] = useState<string>(''); // HH:mm
    const [customEndTime, setCustomEndTime] = useState<string>(''); // HH:mm
    const [rangeStartDate, setRangeStartDate] = useState<string>(''); // YYYY-MM-DD
    const [rangeEndDate, setRangeEndDate] = useState<string>(''); // YYYY-MM-DD

    // ── Order & Payment Statuses (Multi-select) ────────────────────────────────
    const [selectedOrderStatuses, setSelectedOrderStatuses] = useState<string[]>([]);
    const [selectedPaymentStatuses, setSelectedPaymentStatuses] = useState<string[]>([]);

    // ── Itemized Bill & Product Attributes ────────────────────────────────────
    const [filterItemName, setFilterItemName] = useState<string>('');
    const [filterCategoryId, setFilterCategoryId] = useState<string>('');
    const [filterMinUnitPrice, setFilterMinUnitPrice] = useState<string>('');
    const [filterMaxUnitPrice, setFilterMaxUnitPrice] = useState<string>('');
    const [filterMinItemQty, setFilterMinItemQty] = useState<string>('');
    const [filterMaxItemQty, setFilterMaxItemQty] = useState<string>('');

    // ── Channels, Personnel & Financials ──────────────────────────────────────
    const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedCashierId, setSelectedCashierId] = useState<string>('');
    const [filterMinTotal, setFilterMinTotal] = useState<string>('');
    const [filterMaxTotal, setFilterMaxTotal] = useState<string>('');
    const [filterOrderType, setFilterOrderType] = useState<string>('ALL');
    const [filterFulfillmentStatus, setFilterFulfillmentStatus] = useState<string>('ALL');
    const [filterDiscountApplied, setFilterDiscountApplied] = useState<string>('ALL');

    // ── Confirmation Modal for Draft Deletion ──────────────────────────────────
    const [draftToDelete, setDraftToDelete] = useState<any>(null);
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

    // Auto-switch to drafts tab if query param tab=drafts
    useEffect(() => {
        if (queryParams.get('tab') === 'drafts') {
            setMainTab('drafts');
        }
    }, [location.search]);

    // Fetch fresh orders immediately on page mount
    useEffect(() => {
        if (refresh) {
            refresh();
        }
    }, []);

    // Auto-scroll to highlighted order
    useEffect(() => {
        if (highlightId) {
            const el = document.getElementById(`order-${highlightId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightId, orders, isLoading]);

    // Multi-vector search matcher
    const matchesOrderSearch = useCallback((order: any, query: string) => {
        if (!query || !query.trim()) return true;
        const q = query.trim().toLowerCase();

        // 1. Order ID & Reference codes
        const idMatches =
            order.id?.toLowerCase().includes(q) ||
            `ord-${order.id?.slice(-5)}`.toLowerCase().includes(q) ||
            order.id?.slice(-8).toLowerCase().includes(q);

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

        // 7. Order items
        const itemMatches = Array.isArray(order.items) && order.items.some((i: any) =>
            i.product?.name?.toLowerCase().includes(q) ||
            i.product?.sku?.toLowerCase().includes(q) ||
            i.product?.barcode?.toLowerCase().includes(q)
        );

        return idMatches || customerMatches || cashierMatches || storeMatches || paymentMatches || terminalMatches || itemMatches;
    }, []);

    // ── Dynamic Options Extraction from Orders ─────────────────────────────────
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        (orders || []).forEach(o => {
            (o.items || []).forEach((i: any) => {
                if (i.product?.category?.name) cats.add(i.product.category.name);
                else if (i.product?.categoryId) cats.add(i.product.categoryId);
            });
        });
        return Array.from(cats).sort();
    }, [orders]);

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

    // ── Reset all filters ──────────────────────────────────────────────────────
    const clearAllFilters = useCallback(() => {
        setDateMode('preset');
        setDatePreset('all');
        setSingleDate('');
        setSingleTimeMode('fullday');
        setExactTime('');
        setCustomStartTime('');
        setCustomEndTime('');
        setRangeStartDate('');
        setRangeEndDate('');
        setSelectedOrderStatuses([]);
        setSelectedPaymentStatuses([]);
        setFilterItemName('');
        setFilterCategoryId('');
        setFilterMinUnitPrice('');
        setFilterMaxUnitPrice('');
        setFilterMinItemQty('');
        setFilterMaxItemQty('');
        setSelectedPaymentMethods([]);
        setSelectedBranchId('');
        setSelectedCashierId('');
        setFilterMinTotal('');
        setFilterMaxTotal('');
        setFilterOrderType('ALL');
        setFilterFulfillmentStatus('ALL');
        setFilterDiscountApplied('ALL');
    }, []);

    // ── Active Filters Chips ───────────────────────────────────────────────────
    const activeFilterChips = useMemo(() => {
        const chips: { id: string; label: string; onRemove: () => void }[] = [];

        // Date chip
        if (dateMode === 'preset' && datePreset !== 'all') {
            const labels: Record<string, string> = {
                today: 'Date: Today',
                yesterday: 'Date: Yesterday',
                week: 'Date: Last 7 Days',
                month: 'Date: This Month',
                last30: 'Date: Last 30 Days'
            };
            chips.push({ id: 'date-preset', label: labels[datePreset] || `Date: ${datePreset}`, onRemove: () => setDatePreset('all') });
        } else if (dateMode === 'single' && singleDate) {
            if (singleTimeMode === 'fullday') {
                chips.push({ id: 'date-single', label: `Date: ${singleDate}`, onRemove: () => setSingleDate('') });
            } else if (singleTimeMode === 'exact' && exactTime) {
                chips.push({ id: 'date-exact', label: `Exact: ${singleDate} ${exactTime} (±${exactTolerance}m)`, onRemove: () => { setSingleDate(''); setExactTime(''); } });
            } else if (singleTimeMode === 'custom' && (customStartTime || customEndTime)) {
                chips.push({ id: 'date-custom', label: `Time: ${singleDate} ${customStartTime || '00:00'}-${customEndTime || '23:59'}`, onRemove: () => { setSingleDate(''); setCustomStartTime(''); setCustomEndTime(''); } });
            } else {
                chips.push({ id: 'date-single', label: `Date: ${singleDate}`, onRemove: () => setSingleDate('') });
            }
        } else if (dateMode === 'range' && (rangeStartDate || rangeEndDate)) {
            chips.push({ id: 'date-range', label: `Range: ${rangeStartDate || '...'} to ${rangeEndDate || '...'}`, onRemove: () => { setRangeStartDate(''); setRangeEndDate(''); } });
        }

        // Order status chips
        if (selectedOrderStatuses.length > 0) {
            chips.push({ id: 'order-status', label: `Status: ${selectedOrderStatuses.join(', ')}`, onRemove: () => setSelectedOrderStatuses([]) });
        }

        // Payment status chips
        if (selectedPaymentStatuses.length > 0) {
            chips.push({ id: 'pay-status', label: `Payment: ${selectedPaymentStatuses.join(', ')}`, onRemove: () => setSelectedPaymentStatuses([]) });
        }

        // Payment method chips
        if (selectedPaymentMethods.length > 0) {
            chips.push({ id: 'pay-method', label: `Method: ${selectedPaymentMethods.join(', ')}`, onRemove: () => setSelectedPaymentMethods([]) });
        }

        // Item name
        if (filterItemName.trim()) {
            chips.push({ id: 'item-name', label: `Item: "${filterItemName.trim()}"`, onRemove: () => setFilterItemName('') });
        }

        // Category
        if (filterCategoryId) {
            chips.push({ id: 'category', label: `Category: ${filterCategoryId}`, onRemove: () => setFilterCategoryId('') });
        }

        // Item Unit Price
        if (filterMinUnitPrice || filterMaxUnitPrice) {
            chips.push({ id: 'item-price', label: `Item Price: ₦${filterMinUnitPrice || '0'} - ₦${filterMaxUnitPrice || '∞'}`, onRemove: () => { setFilterMinUnitPrice(''); setFilterMaxUnitPrice(''); } });
        }

        // Item Qty
        if (filterMinItemQty || filterMaxItemQty) {
            chips.push({ id: 'item-qty', label: `Qty: ${filterMinItemQty || '0'} - ${filterMaxItemQty || '∞'}`, onRemove: () => { setFilterMinItemQty(''); setFilterMaxItemQty(''); } });
        }

        // Order Total
        if (filterMinTotal || filterMaxTotal) {
            chips.push({ id: 'order-total', label: `Total: ₦${filterMinTotal || '0'} - ₦${filterMaxTotal || '∞'}`, onRemove: () => { setFilterMinTotal(''); setFilterMaxTotal(''); } });
        }

        // Branch
        if (selectedBranchId) {
            const branchObj = availableBranches.find(b => b.id === selectedBranchId);
            chips.push({ id: 'branch', label: `Branch: ${branchObj?.name || selectedBranchId}`, onRemove: () => setSelectedBranchId('') });
        }

        // Cashier
        if (selectedCashierId) {
            const cashierObj = availableCashiers.find(c => c.id === selectedCashierId);
            chips.push({ id: 'cashier', label: `Staff: ${cashierObj?.name || selectedCashierId}`, onRemove: () => setSelectedCashierId('') });
        }

        // Client-side placeholders (orderType, fulfillmentStatus, discountApplied)
        if (filterOrderType && filterOrderType !== 'ALL') {
            chips.push({ id: 'order-type', label: `Type: ${filterOrderType}`, onRemove: () => setFilterOrderType('ALL') });
        }
        if (filterFulfillmentStatus && filterFulfillmentStatus !== 'ALL') {
            chips.push({ id: 'fulfillment', label: `Fulfillment: ${filterFulfillmentStatus}`, onRemove: () => setFilterFulfillmentStatus('ALL') });
        }
        if (filterDiscountApplied && filterDiscountApplied !== 'ALL') {
            chips.push({ id: 'discount', label: `Discount: ${filterDiscountApplied}`, onRemove: () => setFilterDiscountApplied('ALL') });
        }

        return chips;
    }, [
        dateMode, datePreset, singleDate, singleTimeMode, exactTime, exactTolerance, customStartTime, customEndTime,
        rangeStartDate, rangeEndDate, selectedOrderStatuses, selectedPaymentStatuses, selectedPaymentMethods,
        filterItemName, filterCategoryId, filterMinUnitPrice, filterMaxUnitPrice, filterMinItemQty, filterMaxItemQty,
        filterMinTotal, filterMaxTotal, selectedBranchId, selectedCashierId, availableBranches, availableCashiers,
        filterOrderType, filterFulfillmentStatus, filterDiscountApplied
    ]);

    const activeFilterCount = activeFilterChips.length;

    // ── Helper to toggle multi-select pill values ──────────────────────────────
    const toggleStatusPill = (list: string[], setList: (v: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(x => x !== item));
        } else {
            setList([...list, item]);
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

            // 3. Status filter
            if (selectedOrderStatuses.length > 0) {
                if (!selectedOrderStatuses.includes(order.status)) return false;
            }

            // 4. Payment status filter
            if (selectedPaymentStatuses.length > 0) {
                if (!selectedPaymentStatuses.includes(order.paymentStatus)) return false;
            }

            // 5. Payment method filter
            if (selectedPaymentMethods.length > 0) {
                if (!selectedPaymentMethods.includes(order.paymentMethod)) return false;
            }

            // 6. Branch / Cashier filter
            if (selectedBranchId && order.storeId !== selectedBranchId && order.store?.id !== selectedBranchId) {
                return false;
            }
            if (selectedCashierId && order.cashierId !== selectedCashierId && order.cashier?.id !== selectedCashierId) {
                return false;
            }

            // 7. Total Order Amount
            if (filterMinTotal && Number(order.totalAmount) < Number(filterMinTotal)) return false;
            if (filterMaxTotal && Number(order.totalAmount) > Number(filterMaxTotal)) return false;

            // 8. Itemized Bill & Product Attributes
            if (filterItemName.trim()) {
                const term = filterItemName.trim().toLowerCase();
                const hasItem = Array.isArray(order.items) && order.items.some((i: any) =>
                    i.product?.name?.toLowerCase().includes(term) ||
                    i.product?.sku?.toLowerCase().includes(term) ||
                    i.product?.barcode?.toLowerCase().includes(term)
                );
                if (!hasItem) return false;
            }

            if (filterCategoryId) {
                const hasCat = Array.isArray(order.items) && order.items.some((i: any) =>
                    i.product?.categoryId === filterCategoryId ||
                    i.product?.category?.name === filterCategoryId
                );
                if (!hasCat) return false;
            }

            if (filterMinUnitPrice || filterMaxUnitPrice) {
                const minP = filterMinUnitPrice ? Number(filterMinUnitPrice) : -Infinity;
                const maxP = filterMaxUnitPrice ? Number(filterMaxUnitPrice) : Infinity;
                const hasP = Array.isArray(order.items) && order.items.some((i: any) => {
                    const p = Number(i.price);
                    return p >= minP && p <= maxP;
                });
                if (!hasP) return false;
            }

            if (filterMinItemQty || filterMaxItemQty) {
                const minQ = filterMinItemQty ? Number(filterMinItemQty) : -Infinity;
                const maxQ = filterMaxItemQty ? Number(filterMaxItemQty) : Infinity;
                const hasQ = Array.isArray(order.items) && order.items.some((i: any) => {
                    const q = Number(i.quantity);
                    return q >= minQ && q <= maxQ;
                });
                if (!hasQ) return false;
            }

            // 9. Client-side placeholders (orderType, fulfillmentStatus, discountApplied)
            if (filterOrderType && filterOrderType !== 'ALL') {
                if (order.orderType && order.orderType !== filterOrderType) return false;
            }
            if (filterFulfillmentStatus && filterFulfillmentStatus !== 'ALL') {
                if (order.fulfillmentStatus && order.fulfillmentStatus !== filterFulfillmentStatus) return false;
            }

            return true;
        });
    }, [
        orders, searchQuery, dateMode, datePreset, singleDate, singleTimeMode, exactTime, exactTolerance,
        customStartTime, customEndTime, rangeStartDate, rangeEndDate, selectedOrderStatuses,
        selectedPaymentStatuses, selectedPaymentMethods, selectedBranchId, selectedCashierId,
        filterMinTotal, filterMaxTotal, filterItemName, filterCategoryId, filterMinUnitPrice,
        filterMaxUnitPrice, filterMinItemQty, filterMaxItemQty, filterOrderType, filterFulfillmentStatus,
        matchesOrderSearch
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Transaction Archives</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Review, multi-vector search, filter and export sales & hold orders</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Main Tab Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button
                            onClick={() => setMainTab('all')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Tag size={14} />
                            All Sales ({(orders || []).length})
                        </button>
                        <button
                            onClick={() => setMainTab('drafts')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'drafts' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Clock size={14} />
                            Hold / Drafts ({(draftOrders || []).length})
                        </button>
                    </div>

                    {/* Search Input with Multi-Field Support */}
                    <div className="relative group flex-1 xl:flex-none xl:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 dark:group-focus-within:text-white transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search ID, Customer, Staff, Branch, Item..."
                            className="w-full pl-12 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 dark:focus:border-gray-500 outline-none font-bold text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
                                title="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {mainTab === 'all' && (
                        /* Advanced Filters Accordion Trigger Button */
                        <button
                            onClick={() => setFilterPanelOpen(prev => !prev)}
                            className={`px-4 py-3 rounded-2xl border transition-all flex items-center gap-2.5 font-black text-xs uppercase tracking-wider shadow-sm ${
                                filterPanelOpen || activeFilterCount > 0
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white shadow-md ring-2 ring-gray-900/10'
                                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            <SlidersHorizontal size={16} />
                            <span>Filters</span>
                            {activeFilterCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    filterPanelOpen || activeFilterCount > 0
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                }`}>
                                    {activeFilterCount}
                                </span>
                            )}
                            {filterPanelOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}

                    <button
                        onClick={downloadCSV}
                        className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                    >
                        <Download size={18} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* ── Active Filter Chips Bar ── */}
            {activeFilterChips.length > 0 && mainTab === 'all' && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-gray-800 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 pl-1">
                        Active Filters ({activeFilterChips.length}):
                    </span>
                    {activeFilterChips.map(chip => (
                        <span
                            key={chip.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"
                        >
                            <span>{chip.label}</span>
                            <button
                                onClick={chip.onRemove}
                                className="p-0.5 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                title="Remove filter"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={clearAllFilters}
                        className="text-xs font-black text-red-500 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 transition-colors uppercase tracking-wider underline underline-offset-2"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* ── Inline Expandable Advanced Filter Panel (Accordion) ── */}
            {mainTab === 'all' && (
                <div
                    className={`transition-all duration-300 ease-in-out ${
                        filterPanelOpen ? 'max-h-[1400px] opacity-100 mb-6' : 'max-h-0 opacity-0 overflow-hidden m-0 p-0 pointer-events-none'
                    }`}
                >
                    <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 xl:p-8 shadow-xl space-y-6">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center font-black">
                                    <SlidersHorizontal size={16} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-gray-900 dark:text-white leading-tight">Advanced Filter Funnel</h3>
                                    <p className="text-xs font-medium text-gray-400">Filter transactions across date/time, order/payment status, line items, and channels</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={clearAllFilters}
                                    className="px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
                                >
                                    Reset All
                                </button>
                                <button
                                    onClick={() => setFilterPanelOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                                    title="Close panel"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* 4-Column Responsive Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {/* ── COLUMN 1: Date & Time Picker ── */}
                            <div className="space-y-4 p-4 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Calendar size={14} className="text-[#8B1538]" /> Date & Time Range
                                    </h4>
                                </div>

                                {/* Mode Switcher */}
                                <div className="grid grid-cols-3 gap-1 bg-gray-200/70 dark:bg-slate-700/70 p-1 rounded-xl text-[10px] font-black uppercase tracking-wider">
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('preset')}
                                        className={`py-1.5 rounded-lg transition-all ${dateMode === 'preset' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        Presets
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('single')}
                                        className={`py-1.5 rounded-lg transition-all ${dateMode === 'single' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        Single Day
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDateMode('range')}
                                        className={`py-1.5 rounded-lg transition-all ${dateMode === 'range' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        Multi-Day
                                    </button>
                                </div>

                                {/* MODE A: Quick Presets */}
                                {dateMode === 'preset' && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick Presets</label>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { id: 'all', label: 'All Time' },
                                                { id: 'today', label: 'Today' },
                                                { id: 'yesterday', label: 'Yesterday' },
                                                { id: 'week', label: 'Last 7 Days' },
                                                { id: 'last30', label: 'Last 30 Days' },
                                                { id: 'month', label: 'This Month' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setDatePreset(p.id)}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold text-left transition-all border ${
                                                        datePreset === p.id
                                                            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-gray-700 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* MODE B: Single Day with Time Scope */}
                                {dateMode === 'single' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Date</label>
                                            <input
                                                type="date"
                                                value={singleDate}
                                                onChange={(e) => setSingleDate(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-gray-900"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Time Granularity</label>
                                            <div className="grid grid-cols-3 gap-1 bg-gray-200/60 dark:bg-slate-700/60 p-1 rounded-xl text-[9px] font-black uppercase">
                                                <button
                                                    type="button"
                                                    onClick={() => setSingleTimeMode('fullday')}
                                                    className={`py-1 rounded-lg transition-all ${singleTimeMode === 'fullday' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                                                >
                                                    Full Day (24h)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSingleTimeMode('exact')}
                                                    className={`py-1 rounded-lg transition-all ${singleTimeMode === 'exact' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                                                >
                                                    Exact Time
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSingleTimeMode('custom')}
                                                    className={`py-1 rounded-lg transition-all ${singleTimeMode === 'custom' ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
                                                >
                                                    Time Range
                                                </button>
                                            </div>
                                        </div>

                                        {singleTimeMode === 'exact' && (
                                            <div className="space-y-2 pt-1">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Target Time (HH:mm)</label>
                                                    <input
                                                        type="time"
                                                        value={exactTime}
                                                        onChange={(e) => setExactTime(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-gray-900"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] font-bold text-gray-500">
                                                    <span>Window Tolerance:</span>
                                                    <select
                                                        value={exactTolerance}
                                                        onChange={(e) => setExactTolerance(Number(e.target.value))}
                                                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-bold text-gray-900 dark:text-white"
                                                    >
                                                        <option value={5}>± 5 mins</option>
                                                        <option value={15}>± 15 mins</option>
                                                        <option value={30}>± 30 mins</option>
                                                        <option value={60}>± 1 hour</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {singleTimeMode === 'custom' && (
                                            <div className="grid grid-cols-2 gap-2 pt-1">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">From Time</label>
                                                    <input
                                                        type="time"
                                                        value={customStartTime}
                                                        onChange={(e) => setCustomStartTime(e.target.value)}
                                                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">To Time</label>
                                                    <input
                                                        type="time"
                                                        value={customEndTime}
                                                        onChange={(e) => setCustomEndTime(e.target.value)}
                                                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* MODE C: Multi-Day Date Range */}
                                {dateMode === 'range' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Start Date</label>
                                            <input
                                                type="date"
                                                value={rangeStartDate}
                                                onChange={(e) => setRangeStartDate(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">End Date</label>
                                            <input
                                                type="date"
                                                value={rangeEndDate}
                                                onChange={(e) => setRangeEndDate(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ── COLUMN 2: Order & Payment Statuses ── */}
                            <div className="space-y-4 p-4 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Tag size={14} className="text-amber-500" /> Order & Payment Statuses
                                </h4>

                                {/* Order Status Multi-Select Pills */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Order Status</label>
                                        {selectedOrderStatuses.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedOrderStatuses([])}
                                                className="text-[10px] font-bold text-red-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['COMPLETED', 'PENDING', 'READY', 'CANCELLED', 'REFUNDED'].map(st => {
                                            const active = selectedOrderStatuses.includes(st);
                                            return (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    onClick={() => toggleStatusPill(selectedOrderStatuses, setSelectedOrderStatuses, st)}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1 ${
                                                        active
                                                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {active && <Check size={12} />}
                                                    <span>{st}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Payment Status Multi-Select Pills */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Status</label>
                                        {selectedPaymentStatuses.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPaymentStatuses([])}
                                                className="text-[10px] font-bold text-red-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['SUCCESS', 'PENDING', 'IN_CHECKOUT', 'FAILED', 'REFUNDED'].map(ps => {
                                            const active = selectedPaymentStatuses.includes(ps);
                                            return (
                                                <button
                                                    key={ps}
                                                    type="button"
                                                    onClick={() => toggleStatusPill(selectedPaymentStatuses, setSelectedPaymentStatuses, ps)}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1 ${
                                                        active
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {active && <Check size={12} />}
                                                    <span>{ps === 'SUCCESS' ? 'PAID / SUCCESS' : ps}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fulfillment Status (Client Placeholder) */}
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Fulfillment Track</label>
                                    <select
                                        value={filterFulfillmentStatus}
                                        onChange={(e) => setFilterFulfillmentStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
                                    >
                                        <option value="ALL">All Fulfillment Tracks</option>
                                        <option value="DELIVERED">Delivered</option>
                                        <option value="IN_PREPARATION">In Preparation</option>
                                        <option value="READY_FOR_PICKUP">Ready for Pickup</option>
                                        <option value="SHIPPED">Shipped</option>
                                    </select>
                                </div>
                            </div>

                            {/* ── COLUMN 3: Itemized Bill & Product Attributes ── */}
                            <div className="space-y-4 p-4 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Package size={14} className="text-blue-500" /> Line Items & Attributes
                                </h4>

                                {/* Item Name / SKU Search */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Line Item Name or SKU</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Milk, DM-SKU-001..."
                                        value={filterItemName}
                                        onChange={(e) => setFilterItemName(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-gray-900"
                                    />
                                </div>

                                {/* Category Selector */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Product Category</label>
                                    <select
                                        value={filterCategoryId}
                                        onChange={(e) => setFilterCategoryId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
                                    >
                                        <option value="">All Categories</option>
                                        {availableCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Min / Max Unit Price */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Item Unit Price (₦)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min ₦"
                                            value={filterMinUnitPrice}
                                            onChange={(e) => setFilterMinUnitPrice(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max ₦"
                                            value={filterMaxUnitPrice}
                                            onChange={(e) => setFilterMaxUnitPrice(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Min / Max Item Quantity */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Line Quantity Range</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min Qty"
                                            value={filterMinItemQty}
                                            onChange={(e) => setFilterMinItemQty(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max Qty"
                                            value={filterMaxItemQty}
                                            onChange={(e) => setFilterMaxItemQty(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── COLUMN 4: Channels, Personnel & Financials ── */}
                            <div className="space-y-4 p-4 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <CreditCard size={14} className="text-purple-500" /> Channels & Personnel
                                </h4>

                                {/* Payment Method Multi-Select */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Methods</label>
                                        {selectedPaymentMethods.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedPaymentMethods([])}
                                                className="text-[10px] font-bold text-red-500 hover:underline"
                                            >
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['CASH', 'CARD', 'TRANSFER', 'WALLET', 'SPLIT', 'CREDIT'].map(m => {
                                            const active = selectedPaymentMethods.includes(m);
                                            return (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => toggleStatusPill(selectedPaymentMethods, setSelectedPaymentMethods, m)}
                                                    className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all border flex items-center gap-1 ${
                                                        active
                                                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                                            : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
                                                    }`}
                                                >
                                                    {active && <Check size={10} />}
                                                    <span>{m}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Branch Selector */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Store / Branch</label>
                                    <select
                                        value={selectedBranchId}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
                                    >
                                        <option value="">All Branches</option>
                                        {availableBranches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Staff / Cashier Selector */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Cashier / Staff</label>
                                    <select
                                        value={selectedCashierId}
                                        onChange={(e) => setSelectedCashierId(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
                                    >
                                        <option value="">All Staff</option>
                                        {availableCashiers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Min / Max Order Total */}
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Order Total Amount (₦)</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="number"
                                            placeholder="Min ₦"
                                            value={filterMinTotal}
                                            onChange={(e) => setFilterMinTotal(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                        <input
                                            type="number"
                                            placeholder="Max ₦"
                                            value={filterMaxTotal}
                                            onChange={(e) => setFilterMaxTotal(e.target.value)}
                                            className="w-full px-2.5 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Panel Footer */}
                        <div className="flex flex-wrap items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 text-xs">
                            <div className="text-gray-400 font-bold">
                                Matching <span className="text-gray-900 dark:text-white font-black">{filteredOrders.length}</span> of {orders.length} total sales records
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={clearAllFilters}
                                    className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-gray-500 hover:text-red-600 transition-colors"
                                >
                                    Clear Filters
                                </button>
                                <button
                                    onClick={() => setFilterPanelOpen(false)}
                                    className="px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:opacity-90 transition-all"
                                >
                                    Apply & View Results ({filteredOrders.length})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Container */}
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
                        <tbody className="divide-y divide-gray-50">
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
                                            ? 'bg-green-50 ring-2 ring-inset ring-[#2D7A3E]/30 animate-pulse-subtle'
                                            : 'hover:bg-gray-50/30'
                                        }`}
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-all">
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
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2">
                                            {/* Fulfillment Status */}
                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${order.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    order.status === 'READY' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${order.status === 'COMPLETED' ? 'bg-green-500' :
                                                        order.status === 'READY' ? 'bg-blue-500' :
                                                            'bg-amber-500'
                                                    }`}></div>
                                                FUL: {order.status}
                                            </span>
                                            {/* Payment Status */}
                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${order.paymentStatus === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    order.paymentStatus === 'IN_CHECKOUT' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                                    order.paymentStatus === 'DRAFT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
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
                                                className="p-2 hover:bg-gray-100 rounded-xl text-gray-300 hover:text-gray-900 transition-all"
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
                    <div className="p-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        <span>Viewing {filteredOrders.length} of {orders.length} Global Records</span>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-900">Page 01</span>
                            <ChevronDown size={14} />
                        </div>
                    </div>
                )}
            </div>

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-[101] overflow-hidden animate-in zoom-in-95">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">Transaction Details</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Ref: ORD-{selectedOrder.id.slice(-5).toUpperCase()} • {new Date(selectedOrder.createdAt).toLocaleString()}
                                </p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400">
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
                                </h3>
                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 dark:bg-slate-800 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black">
                                            <tr>
                                                <th className="px-4 py-3">Item</th>
                                                <th className="px-4 py-3 text-center">Qty</th>
                                                <th className="px-4 py-3 text-right">Unit Price</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800 text-sm">
                                            {selectedOrder.items?.map((item: any) => (
                                                <tr key={item.id} className="font-bold text-gray-900 dark:text-gray-200">
                                                    <td className="px-4 py-3">{item.product?.name || `Product ID: ${item.productId.slice(0, 8)}...`}</td>
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
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 text-xs font-black rounded-full uppercase tracking-widest">
                                            <CreditCard size={12} /> {selectedOrder.paymentMethod}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full border uppercase tracking-widest ${selectedOrder.paymentStatus === 'SUCCESS' ? 'bg-green-50 text-green-600 border-green-100' :
                                                selectedOrder.paymentStatus === 'FAILED' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                            PAY: {selectedOrder.paymentStatus || 'PENDING'}
                                        </span>
                                    </div>
                                    {selectedOrder.posDeviceType && (
                                        <div className="mt-2 text-[10px] font-black uppercase text-gray-600 bg-gray-200/60 px-2.5 py-1 rounded-lg">
                                            Device: {selectedOrder.posDeviceType}
                                        </div>
                                    )}
                                    {selectedOrder.terminalTransaction && (
                                        <div className="mt-2 text-[10px] font-mono font-bold text-green-700 bg-green-100/60 px-2.5 py-1 rounded-lg">
                                            Monnify Ref: {selectedOrder.terminalTransaction.transactionRef}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Fulfillment</p>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-black rounded-full border uppercase tracking-widest ${selectedOrder.status === 'COMPLETED' ? 'bg-green-50 text-green-600 border-green-100' :
                                            selectedOrder.status === 'READY' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                'bg-amber-50 text-amber-600 border-amber-100'
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
                                        className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-2xl border border-red-200 transition-all text-sm uppercase tracking-widest"
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
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
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

            {/* ── Refund Modal ── */}
            {refundTarget && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                    <RotateCcw size={24} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900 dark:text-white">Issue Refund</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ORD-{refundTarget.id.slice(-5).toUpperCase()} · ₦{Number(refundTarget.totalAmount).toLocaleString()}</p>
                                </div>
                            </div>
                            <button onClick={() => setRefundTarget(null)} className="p-2 hover:bg-gray-100 rounded-xl">
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

