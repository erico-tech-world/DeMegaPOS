import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    GitBranch, DollarSign, ShoppingBag, TrendingUp, TrendingDown,
    RefreshCw, AlertTriangle, BarChart2, Building2, Award,
    Calendar, ChevronDown
} from 'lucide-react';

import { API_URL } from '../../lib/apiConfig';
import { Tooltip } from '../../components/Tooltip';

// ─── Analysis Period Presets (Aligned with /analytics) ────────────────────────
const PRESETS = [
    { label: 'Today', ms: 1 * 24 * 60 * 60 * 1000 },
    { label: 'This Week', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: 'This Month', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: '1 Year', ms: 365 * 24 * 60 * 60 * 1000 },
    { label: '3 Years', ms: 3 * 365 * 24 * 60 * 60 * 1000 },
    { label: '5 Years', ms: 5 * 365 * 24 * 60 * 60 * 1000 },
];

// ─── Custom Date Range Picker Component (Aligned with /analytics) ────────────
const DateRangePicker = ({ onApply, isActive }: { onApply: (from: string, to: string) => void; isActive: boolean }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const today = new Date().toISOString().split('T')[0];

    const handleApply = () => {
        if (!from || !to) return;
        if (new Date(from) > new Date(to)) return;
        onApply(from, to);
        setOpen(false);
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all border ${isActive
                    ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-900/20'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
                <Calendar size={13} />
                {from && to ? `${from} → ${to}` : 'Custom Range'}
                <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl p-5 w-80 animate-in fade-in slide-in-from-top-2 duration-150">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Select Date Range</p>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-black text-gray-600 dark:text-gray-400 mb-1">From</label>
                            <input
                                type="date"
                                value={from}
                                max={to || today}
                                onChange={e => setFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-800 dark:text-white bg-gray-50 dark:bg-slate-700 focus:outline-none focus:border-purple-400 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-600 dark:text-gray-400 mb-1">To</label>
                            <input
                                type="date"
                                value={to}
                                min={from}
                                max={today}
                                onChange={e => setTo(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-bold text-gray-800 dark:text-white bg-gray-50 dark:bg-slate-700 focus:outline-none focus:border-purple-400 transition-colors"
                            />
                        </div>
                        {from && to && new Date(from) > new Date(to) && (
                            <p className="text-red-500 text-xs font-bold flex items-center gap-1">
                                <AlertTriangle size={11} /> "From" date must be before "To" date
                            </p>
                        )}
                        <button
                            onClick={handleApply}
                            disabled={!from || !to || new Date(from) > new Date(to)}
                            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-black rounded-xl text-sm transition-all"
                        >
                            Apply Range
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── StatCard with Accessible Tooltip for Truncated Values ───────────────────
interface StatCardProps {
    title: string;
    value: string;
    rawTooltipValue?: string;
    icon: any;
    color: string;
    sub?: string;
}

const StatCard = ({ title, value, rawTooltipValue, icon: Icon, color, sub }: StatCardProps) => (
    <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
            <Icon size={22} style={{ color }} />
        </div>
        <div className="min-w-0 flex-1">
            <Tooltip content={title} position="top" className="w-full block">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate cursor-default">{title}</p>
            </Tooltip>
            
            <Tooltip content={rawTooltipValue || value} position="top" className="w-full block">
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5 truncate cursor-default">{value}</p>
            </Tooltip>

            {sub && (
                <Tooltip content={sub} position="bottom" className="w-full block">
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-bold truncate cursor-default">{sub}</p>
                </Tooltip>
            )}
        </div>
    </div>
);

// ─── Main Multi-Branch Comparison Page ───────────────────────────────────────
const MultiBranchComparison = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [branchData, setBranchData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Period state — aligned with /analytics
    const [activePreset, setActivePreset] = useState('This Month');
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

    const buildRange = useCallback(() => {
        if (dateRange) {
            return {
                startDate: new Date(dateRange.from + 'T00:00:00').toISOString(),
                endDate: new Date(dateRange.to + 'T23:59:59').toISOString(),
            };
        }
        const preset = PRESETS.find(p => p.label === activePreset) || PRESETS[2];
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - preset.ms);
        return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
    }, [activePreset, dateRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const branchRes = await axios.get(`${API_URL}/tenants/branches`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const allBranches = branchRes.data as any[];
            setBranches(allBranches);

            const { startDate, endDate } = buildRange();

            // Fetch analytics for each branch in parallel with explicit branch isolation and date range
            const results = await Promise.allSettled(
                allBranches.map((b: any) =>
                    axios.get(`${API_URL}/orders/analytics`, {
                        params: { startDate, endDate, storeId: b.id, branchId: b.id },
                        headers: { Authorization: `Bearer ${token}` },
                    }).then(r => ({ branchId: b.id, data: r.data }))
                )
            );

            const map: Record<string, any> = {};
            results.forEach(r => {
                if (r.status === 'fulfilled') {
                    map[r.value.branchId] = r.value.data;
                }
            });
            setBranchData(map);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to load multi-branch data.');
        } finally {
            setLoading(false);
        }
    }, [buildRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handlePreset = (label: string) => {
        setActivePreset(label);
        setDateRange(null);
    };

    const handleDateRange = (from: string, to: string) => {
        setDateRange({ from, to });
        setActivePreset('');
    };

    // ── Consolidated Totals (Subtracting refunds across ALL branches) ───────────
    const consolidated = Object.values(branchData).reduce(
        (acc: any, d: any) => ({
            totalGrossRevenue: acc.totalGrossRevenue + Number(d?.summary?.grossRevenue || 0),
            totalRevenue: acc.totalRevenue + Number(d?.summary?.netRevenue || 0),
            totalOrders: acc.totalOrders + Number(d?.summary?.totalOrders || 0),
            totalProfit: acc.totalProfit + Number(d?.summary?.netProfit || 0),
            totalRefundedAmount: acc.totalRefundedAmount + Number(d?.refundsSummary?.totalRefundedAmount || d?.summary?.totalRefundedAmount || 0),
            totalRefunds: acc.totalRefunds + Number(d?.summary?.totalRefundVolume || 0),
        }),
        { totalGrossRevenue: 0, totalRevenue: 0, totalOrders: 0, totalProfit: 0, totalRefundedAmount: 0, totalRefunds: 0 }
    );

    const maxRevenue = Math.max(...branches.map(b => Number(branchData[b.id]?.summary?.netRevenue || 0)), 1);

    // ── Per-branch rows sorted by net revenue desc ─────────────────────────────
    const rankedBranches = [...branches].sort((a, b) =>
        Number(branchData[b.id]?.summary?.netRevenue || 0) - Number(branchData[a.id]?.summary?.netRevenue || 0)
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center">
                            <GitBranch size={20} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        Multi-Branch Performance
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-bold">Consolidated net revenue & refund intelligence across all branches</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Analysis Period Selector Card (Aligned with /analytics) ── */}
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">Analysis Period</p>
                <div className="flex flex-wrap gap-2 items-center">
                    {PRESETS.map(p => (
                        <button
                            key={p.label}
                            onClick={() => handlePreset(p.label)}
                            className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activePreset === p.label && !dateRange
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                            }`}
                        >
                            {p.label}
                        </button>
                    ))}
                    {/* Calendar-based date range picker */}
                    <DateRangePicker
                        onApply={handleDateRange}
                        isActive={!!dateRange}
                    />
                </div>
                {dateRange && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-3 flex items-center gap-1.5">
                        <Calendar size={11} />
                        Showing data from <span className="font-black">{dateRange.from}</span> to <span className="font-black">{dateRange.to}</span>
                    </p>
                )}
            </div>

            {/* ── Error State ── */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-700 dark:text-red-400 font-bold text-sm flex items-center gap-3">
                    <AlertTriangle size={20} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* ── Loading ── */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 h-24 animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && (
                <>
                    {/* ── Consolidated Overview Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Net Revenue"
                            value={`₦${consolidated.totalRevenue.toLocaleString()}`}
                            rawTooltipValue={`Full Net Revenue: ₦${consolidated.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Gross: ₦${consolidated.totalGrossRevenue.toLocaleString()})`}
                            icon={DollarSign}
                            color="#2D7A3E"
                            sub="Gross minus all refunds"
                        />
                        <StatCard
                            title="Total Net Profit"
                            value={`₦${consolidated.totalProfit.toLocaleString()}`}
                            rawTooltipValue={`Full Net Profit: ₦${consolidated.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            icon={TrendingUp}
                            color="#7C3AED"
                            sub="Net sales minus COGS"
                        />
                        <StatCard
                            title="Total Transactions"
                            value={consolidated.totalOrders.toLocaleString()}
                            rawTooltipValue={`Exact Total Orders: ${consolidated.totalOrders.toLocaleString()} completed transactions`}
                            icon={ShoppingBag}
                            color="#2563EB"
                            sub="Completed orders"
                        />
                        <StatCard
                            title="Total Refund Value"
                            value={`₦${consolidated.totalRefundedAmount.toLocaleString()}`}
                            rawTooltipValue={`Full Refund Total: ₦${consolidated.totalRefundedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across ${consolidated.totalRefunds} returns`}
                            icon={TrendingDown}
                            color="#DC2626"
                            sub={`${consolidated.totalRefunds} returns processed`}
                        />
                    </div>

                    {/* ── Revenue Comparison Bars ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                            Branch Net Revenue Comparison
                        </h3>
                        {rankedBranches.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 dark:text-gray-600 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                                No branch data found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {rankedBranches.map((b, i) => {
                                    const rev = Number(branchData[b.id]?.summary?.netRevenue || 0);
                                    const gross = Number(branchData[b.id]?.summary?.grossRevenue || 0);
                                    const refundedAmt = Number(branchData[b.id]?.refundsSummary?.totalRefundedAmount || 0);
                                    const orders = Number(branchData[b.id]?.summary?.totalOrders || 0);
                                    const profit = Number(branchData[b.id]?.summary?.netProfit || 0);
                                    const aov = orders > 0 ? (rev / orders) : 0;
                                    const pct = maxRevenue > 0 && rev > 0 ? Math.max(2, Math.round((rev / maxRevenue) * 100)) : 0;
                                    const barColor = i === 0 ? '#7C3AED' : i === 1 ? '#2D7A3E' : i === 2 ? '#2563EB' : '#D97706';

                                    return (
                                        <div key={b.id} className="group">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white shrink-0`} style={{ backgroundColor: barColor }}>
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Tooltip content={`${b.name} (${b.branchCode || 'HQ'}) - ${b.location || 'Omni-location'}`} position="right">
                                                            <p className="font-black text-gray-900 dark:text-white text-sm truncate cursor-default">{b.name}</p>
                                                        </Tooltip>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase truncate">{b.location || b.branchCode || 'Omni-location'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                                    <Tooltip content={`${orders.toLocaleString()} completed transactions in this period`}>
                                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500 cursor-default">{orders} txns</span>
                                                    </Tooltip>
                                                    <Tooltip content={`Net Revenue: ₦${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="font-black text-gray-900 dark:text-white text-sm cursor-default">₦{rev.toLocaleString()}</span>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                                                />
                                            </div>
                                            {/* Detailed metrics row */}
                                            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 pl-10">
                                                <Tooltip content={`Gross Sales before refunds: ₦${gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                    <span>Gross: <strong className="text-gray-700 dark:text-gray-300">₦{gross.toLocaleString()}</strong></span>
                                                </Tooltip>
                                                <Tooltip content={`Total Refunded Value: ₦${refundedAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                    <span>Refunded: <strong className="text-red-500">₦{refundedAmt.toLocaleString()}</strong></span>
                                                </Tooltip>
                                                <Tooltip content={`Net Profit (Revenue - COGS): ₦${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                    <span>Profit: <strong className="text-gray-700 dark:text-gray-300">₦{profit.toLocaleString()}</strong></span>
                                                </Tooltip>
                                                <Tooltip content={`Average Order Value: ₦${aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                    <span>AOV: <strong className="text-gray-700 dark:text-gray-300">₦{aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Detailed Per-Branch Table with Accessible Tooltips ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-500" />
                                Branch-Isolated Net Financial Breakdown
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Real-Time Database Records</span>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-8 py-4">Branch</th>
                                        <th className="px-6 py-4 text-right">Transactions</th>
                                        <th className="px-6 py-4 text-right">Gross Sales</th>
                                        <th className="px-6 py-4 text-right text-red-500">Refunded (₦)</th>
                                        <th className="px-6 py-4 text-right">Net Revenue</th>
                                        <th className="px-6 py-4 text-right">Net Profit</th>
                                        <th className="px-6 py-4 text-right">AOV</th>
                                        <th className="px-6 py-4 text-right">Refund Rate</th>
                                        <th className="px-8 py-4 text-center">Revenue Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {rankedBranches.map((b, i) => {
                                        const d = branchData[b.id]?.summary || {};
                                        const refD = branchData[b.id]?.refundsSummary || {};
                                        const rev = Number(d.netRevenue || 0);
                                        const gross = Number(d.grossRevenue || rev);
                                        const refundedAmt = Number(refD.totalRefundedAmount || d.totalRefundedAmount || 0);
                                        const refundVol = Number(refD.totalRefundVolume || d.totalRefundVolume || 0);
                                        const orders = Number(d.totalOrders || 0);
                                        const profit = Number(d.netProfit || 0);
                                        const aov = orders > 0 ? Math.round(rev / orders) : 0;
                                        const refundRate = Number(d.refundRate || 0);
                                        const share = consolidated.totalRevenue > 0 ? Math.round((rev / consolidated.totalRevenue) * 100) : 0;

                                        return (
                                            <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-colors">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-xs">
                                                            {i + 1}
                                                        </div>
                                                        <div>
                                                            <Tooltip content={`Branch: ${b.name} (Code: ${b.branchCode || 'HQ'})`} position="right">
                                                                <p className="font-black text-gray-900 dark:text-white text-sm truncate max-w-[180px] cursor-default">{b.name}</p>
                                                            </Tooltip>
                                                            {b.branchCode && <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Code: {b.branchCode}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-gray-700 dark:text-gray-300">
                                                    <Tooltip content={`${orders.toLocaleString()} completed orders`}>
                                                        <span className="cursor-default">{orders.toLocaleString()}</span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-gray-500 dark:text-gray-400 text-sm">
                                                    <Tooltip content={`Gross: ₦${gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="cursor-default">₦{gross.toLocaleString()}</span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-5 text-right text-sm">
                                                    <Tooltip content={`Total Refunded: ₦${refundedAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across ${refundVol} return(s)`}>
                                                        <div className="cursor-default">
                                                            <span className="font-black text-red-500">₦{refundedAmt.toLocaleString()}</span>
                                                            {refundVol > 0 && <span className="block text-[9px] text-gray-400 font-bold">({refundVol} returns)</span>}
                                                        </div>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-gray-900 dark:text-white text-sm">
                                                    <Tooltip content={`Net Revenue: ₦${rev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="cursor-default">₦{rev.toLocaleString()}</span>
                                                    </Tooltip>
                                                </td>
                                                <td className={`px-6 py-5 text-right font-black text-sm ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    <Tooltip content={`Net Profit: ₦${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="cursor-default">₦{profit.toLocaleString()}</span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-gray-600 dark:text-gray-400 text-sm">
                                                    <Tooltip content={`Average Order Value: ₦${aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="cursor-default">₦{aov.toLocaleString()}</span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <Tooltip content={`Refund Rate: ${refundRate}% (${refundVol} returns out of ${orders + refundVol} total requests)`}>
                                                        <span className={`text-xs font-black px-2 py-0.5 rounded-full cursor-default ${refundRate > 5 ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'}`}>
                                                            {refundRate}%
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <Tooltip content={`Contributes ${share}% of consolidated business revenue`}>
                                                        <div className="flex items-center justify-center gap-2 cursor-default">
                                                            <div className="w-16 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                                                <div className="h-1.5 bg-indigo-600 rounded-full" style={{ width: `${share}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-gray-600 dark:text-gray-400">{share}%</span>
                                                        </div>
                                                    </Tooltip>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Top Products Across All Branches ── */}
                    {(() => {
                        const allProducts: Record<string, { name: string; revenue: number; qty: number }> = {};
                        Object.values(branchData).forEach((d: any) => {
                            d?.topProducts?.forEach((p: any) => {
                                if (!allProducts[p.name]) allProducts[p.name] = { name: p.name, revenue: 0, qty: 0 };
                                allProducts[p.name].revenue += Number(p.revenue || 0);
                                allProducts[p.name].qty += Number(p.qty || 0);
                            });
                        });
                        const sorted = Object.values(allProducts).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
                        if (!sorted.length) return null;
                        const maxRev = sorted[0]?.revenue || 1;

                        return (
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Award size={14} className="text-amber-500" />
                                    Top Products — All Branches Combined
                                </h3>
                                <div className="space-y-3">
                                    {sorted.map((p, i) => (
                                        <div key={p.name} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 rounded-2xl transition-colors">
                                            <div className="w-7 h-7 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center text-xs font-black shrink-0">{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <Tooltip content={`Product: ${p.name} (${p.qty} units sold)`} position="top">
                                                        <p className="font-black text-gray-900 dark:text-white text-sm truncate max-w-xs sm:max-w-md cursor-default">{p.name}</p>
                                                    </Tooltip>
                                                    <Tooltip content={`Revenue: ₦${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
                                                        <span className="font-black text-gray-700 dark:text-gray-300 text-sm shrink-0 ml-4 cursor-default">₦{p.revenue.toLocaleString()}</span>
                                                    </Tooltip>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                                    <div className="h-1.5 bg-amber-400 rounded-full" style={{ width: `${Math.max(2, (p.revenue / maxRev) * 100)}%` }} />
                                                </div>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{p.qty} units sold across all branches</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Empty state ── */}
                    {branches.length === 0 && !loading && (
                        <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700 rounded-[2rem] p-16 text-center">
                            <BarChart2 size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <p className="font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm">No branches configured</p>
                            <p className="text-gray-400 dark:text-gray-600 text-xs mt-2">Create branches in Settings → Branches & Sectors first.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MultiBranchComparison;
