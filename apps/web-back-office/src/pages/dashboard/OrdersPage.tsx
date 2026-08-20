import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Download, Calendar, ArrowRight, User as UserIcon, Tag, CreditCard, ChevronDown, X, Package, Clock, Play, Trash2, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';
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

const OrdersPage = ({ orders, draftOrders = [], isLoading, refresh, cancelDraftOrder, lockDraftOrder }: OrdersPageProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
    const [mainTab, setMainTab] = useState<'all' | 'drafts'>('all'); // 'all' or 'drafts'
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    const highlightId = queryParams.get('id');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

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

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesSearch =
                order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.cashier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());

            const orderDate = new Date(order.createdAt);
            const now = new Date();
            let matchesDate = true;

            if (dateFilter === 'today') {
                matchesDate = orderDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = orderDate >= weekAgo;
            } else if (dateFilter === 'month') {
                matchesDate = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
            }

            return matchesSearch && matchesDate;
        });
    }, [orders, searchQuery, dateFilter]);

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
        const sourceList = mainTab === 'drafts' ? draftOrders : filteredOrders;
        return sourceList.filter(o => {
            const matchesSearch =
                o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (o.cashier?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [mainTab, draftOrders, filteredOrders, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">Transaction Archives</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Review, filter and export sales & hold orders</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Main Tab Switcher */}
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-2xl">
                        <button
                            onClick={() => setMainTab('all')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Tag size={14} />
                            All Sales ({orders.length})
                        </button>
                        <button
                            onClick={() => setMainTab('drafts')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${mainTab === 'drafts' ? 'bg-amber-500 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <Clock size={14} />
                            Hold / Drafts ({draftOrders.length})
                        </button>
                    </div>

                    <div className="relative group flex-1 xl:flex-none xl:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-900 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search ID, Customer, Staff..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 dark:focus:border-gray-500 outline-none font-bold text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {mainTab === 'all' && (
                        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm">
                            {['all', 'today', 'week', 'month'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setDateFilter(f)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dateFilter === f ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-900'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
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

