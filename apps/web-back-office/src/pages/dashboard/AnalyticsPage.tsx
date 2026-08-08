import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    BarChart2, TrendingUp, DollarSign, ShoppingBag,
    Clock, AlertTriangle, Calendar, ChevronDown,
    Award, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../lib/apiConfig';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, sub }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}18` }}>
            <Icon size={24} style={{ color }} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-400 truncate">{title}</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
            {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-bold">{sub}</p>}
        </div>
    </div>
);

// ─── Revenue Bar Chart (tooltip-safe) ────────────────────────────────────────
/**
 * The key fix: tooltip lives OUTSIDE the scrollable overflow container,
 * positioned with fixed x/y captured on mouse-enter so it never gets clipped.
 */
const RevenueBarChart = ({ dailyRevenue }: { dailyRevenue: any[] }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; revenue: number; date: string } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const maxRevenue = dailyRevenue.reduce((m, d) => Math.max(m, d.revenue), 0) || 1;
    const CHART_HEIGHT = 200; // px

    return (
        <div className="relative">
            {/* Fixed tooltip — rendered at document level via z-[9999], not inside overflow container */}
            {tooltip && (
                <div
                    className="fixed pointer-events-none z-[9999] bg-gray-900 text-white text-xs font-black px-3 py-2 rounded-xl shadow-xl whitespace-nowrap"
                    style={{ left: tooltip.x + 12, top: tooltip.y - 48 }}
                >
                    <div className="text-[10px] text-gray-400 font-bold mb-0.5">{tooltip.date}</div>
                    ₦{Number(tooltip.revenue).toLocaleString()}
                    {/* Arrow */}
                    <div className="absolute left-3 bottom-[-5px] w-2.5 h-2.5 bg-gray-900 rotate-45" />
                </div>
            )}

            {/* Chart area — overflow-x-auto but NOT overflow-y (so tooltip doesn't clip) */}
            <div
                ref={containerRef}
                className="overflow-x-auto overflow-y-visible"
                style={{ paddingBottom: '32px' }}
            >
                {/* Y-axis + bars */}
                <div className="flex gap-0 items-end" style={{ minWidth: `${Math.max(dailyRevenue.length * 36, 500)}px`, height: `${CHART_HEIGHT}px`, position: 'relative' }}>
                    {/* Y-axis ticks (3 lines) */}
                    {[0.25, 0.5, 0.75, 1].map((ratio) => (
                        <div
                            key={ratio}
                            className="absolute left-0 right-0 border-t border-dashed border-gray-100 dark:border-gray-700 pointer-events-none"
                            style={{ bottom: `${ratio * CHART_HEIGHT}px` }}
                        >
                            <span className="absolute right-full pr-2 text-[9px] text-gray-300 dark:text-gray-600 font-bold -translate-y-1/2">
                                {ratio === 1 ? `₦${(maxRevenue / 1000).toFixed(0)}k` : ''}
                            </span>
                        </div>
                    ))}

                    {dailyRevenue.map((d: any, i: number) => {
                        const barH = Math.max(4, Math.round((d.revenue / maxRevenue) * (CHART_HEIGHT - 20)));
                        const dateLabel = new Date(d.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center justify-end flex-1 px-0.5 h-full"
                            >
                                {/* Bar */}
                                <div
                                    className="w-full rounded-t-lg cursor-default transition-all duration-150"
                                    style={{
                                        height: `${barH}px`,
                                        background: 'linear-gradient(180deg, #7C3AED 0%, #A855F7 100%)',
                                        opacity: 0.8,
                                    }}
                                    onMouseEnter={(e) => {
                                        setTooltip({ x: e.clientX, y: e.clientY, revenue: d.revenue, date: dateLabel });
                                    }}
                                    onMouseMove={(e) => {
                                        setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                />
                                {/* Date label below bar */}
                                <span
                                    className="text-[7.5px] text-gray-400 dark:text-gray-500 font-bold mt-1.5 whitespace-nowrap"
                                    style={{
                                        writingMode: dailyRevenue.length > 20 ? 'vertical-rl' : 'horizontal-tb',
                                        transform: dailyRevenue.length > 20 ? 'rotate(180deg)' : 'none',
                                        maxHeight: dailyRevenue.length > 20 ? '40px' : 'unset',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {dailyRevenue.length > 30
                                        ? (i % 3 === 0 ? dateLabel : '')
                                        : dateLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ─── Date Range Calendar Picker ───────────────────────────────────────────────
const DateRangePicker = ({ onApply, isActive }: { onApply: (from: string, to: string) => void; isActive: boolean }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on outside click
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

// ─── Main Analytics Page ──────────────────────────────────────────────────────
const PRESETS = [
    { label: 'Today', ms: 1 * 24 * 60 * 60 * 1000 },
    { label: 'This Week', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: 'This Month', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: '1 Year', ms: 365 * 24 * 60 * 60 * 1000 },
    { label: '3 Years', ms: 3 * 365 * 24 * 60 * 60 * 1000 },
    { label: '5 Years', ms: 5 * 365 * 24 * 60 * 60 * 1000 },
];

const AnalyticsPage = () => {
    const { user } = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Period state — either preset ms-based or explicit ISO date range
    const [activePreset, setActivePreset] = useState('This Month');
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

    const fetchAnalytics = useCallback(async (params: { startDate: string; endDate: string }) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const storeId = localStorage.getItem('selectedBranchId') || undefined;
            const res = await axios.get(`${API_URL}/orders/analytics`, {
                params: { ...params, storeId },
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(res.data);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Compute date range from active preset or explicit range
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

    useEffect(() => {
        fetchAnalytics(buildRange());
    }, [buildRange, fetchAnalytics]);

    const handlePreset = (label: string) => {
        setActivePreset(label);
        setDateRange(null);
    };

    const handleDateRange = (from: string, to: string) => {
        setDateRange({ from, to });
        setActivePreset('');
    };

    const maxHourCount = data?.peakHours?.reduce((max: number, h: any) => Math.max(max, h.count), 0) || 1;

    // ── Derived ABC Inventory classification ──────────────────────────────────
    // Based on revenue contribution: A = top 20% revenue, B = next 30%, C = rest
    const abcInventory = (() => {
        if (!data?.topProducts?.length) return null;
        const sorted = [...data.topProducts].sort((a: any, b: any) => b.revenue - a.revenue);
        const totalRev = sorted.reduce((s: number, p: any) => s + Number(p.revenue), 0) || 1;
        let cumulative = 0;
        return sorted.map((p: any) => {
            cumulative += Number(p.revenue);
            const pct = (cumulative / totalRev) * 100;
            const tier = pct <= 20 ? 'A' : pct <= 50 ? 'B' : 'C';
            return { ...p, tier };
        });
    })();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950/50 rounded-2xl flex items-center justify-center">
                            <BarChart2 size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        Store Analytics
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-bold">Real-time revenue intelligence dashboard</p>
                </div>
                <div className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-800 px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700">
                    {user?.role}
                </div>
            </div>

            {/* ── Period Selector ── */}
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

            {/* ── Loading Skeleton ── */}
            {loading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 h-28 animate-pulse" />
                    ))}
                </div>
            )}

            {!loading && data && (
                <>
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Net Revenue"
                            value={`₦${Number(data.summary.netRevenue || data.summary.totalRevenue).toLocaleString()}`}
                            icon={DollarSign}
                            color="#2D7A3E"
                            sub={`Gross: ₦${Number(data.summary.grossRevenue || data.summary.totalRevenue).toLocaleString()}`}
                        />
                        <StatCard
                            title="Net Profit"
                            value={`₦${Number(data.summary.netProfit).toLocaleString()}`}
                            icon={TrendingUp}
                            color="#7C3AED"
                        />
                        <StatCard
                            title="Avg Order Value"
                            value={`₦${Number(data.summary.aov).toLocaleString()}`}
                            icon={ShoppingBag}
                            color="#2563EB"
                        />
                        <StatCard
                            title="Total Transactions"
                            value={data.summary.totalOrders.toLocaleString()}
                            icon={Activity}
                            color="#D97706"
                            sub={`${data.summary.totalRefundVolume || 0} refunded`}
                        />
                    </div>

                    {/* ── Daily Revenue Timeline (fixed tooltip) ── */}
                    {data.dailyRevenue?.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-purple-600 rounded-full" />
                                    Daily Net Revenue Timeline
                                </h3>
                                <div className="text-xs font-bold text-gray-400 dark:text-gray-500">
                                    {data.dailyRevenue.length} days
                                </div>
                            </div>
                            <RevenueBarChart dailyRevenue={data.dailyRevenue} />
                        </div>
                    )}

                    {/* ── Refunds & Returns Summary Section ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-5 bg-red-600 rounded-full" />
                                Refunds &amp; Returns Summary
                            </h3>
                            <span className="text-xs font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-1 rounded-full uppercase">
                                Refund Rate: {data.summary?.refundRate || 0}%
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="p-5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Refunded Amount</p>
                                <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">₦{Number(data.summary?.totalRefundedAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Refund Volume</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{data.summary?.totalRefundVolume || 0} Returns</p>
                            </div>
                            <div className="p-5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross vs Net Variance</p>
                                <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">₦{Number((data.summary?.grossRevenue || 0) - (data.summary?.netRevenue || 0)).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Return Reasons Breakdown */}
                        {data.refundsSummary?.reasonsBreakdown?.length > 0 ? (
                            <div className="space-y-3 pt-2">
                                <p className="text-xs font-black uppercase text-gray-400 tracking-wider">Return Reasons Breakdown</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {data.refundsSummary.reasonsBreakdown.map((r: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-red-50/40 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-2xl flex justify-between items-center">
                                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{r.reason}</span>
                                            <span className="text-xs font-black text-red-600 dark:text-red-400">{r.count} return(s)</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest border border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                                No refund records for this analysis period.
                            </div>
                        )}
                    </div>

                    {/* ── Payment Methods + Peak Hours ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Methods */}
                        {data.paymentMethods?.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                                    Payment Method Distribution
                                </h3>
                                <div className="space-y-4">
                                    {data.paymentMethods.map((pm: any) => {
                                        const totalOrders = data.summary.totalOrders || 1;
                                        const pct = Math.round((pm.count / totalOrders) * 100);
                                        return (
                                            <div key={pm.method}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">{pm.method}</span>
                                                    <span className="text-xs font-black text-gray-500 dark:text-gray-400">{pm.count} orders ({pct}%)</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Peak Hours Heatmap */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Clock size={14} className="text-amber-500" />
                                Peak Sales Hours
                            </h3>
                            <div className="grid grid-cols-12 gap-1">
                                {data.peakHours?.map((h: any) => {
                                    const intensity = Math.round((h.count / maxHourCount) * 100);
                                    return (
                                        <div key={h.hour} className="flex flex-col items-center gap-1" title={`${h.hour}:00 — ${h.count} orders`}>
                                            <div
                                                className="w-full aspect-square rounded-md transition-colors cursor-default"
                                                style={{
                                                    backgroundColor: h.count > 0
                                                        ? `rgba(124,58,237,${0.1 + (intensity / 100) * 0.9})`
                                                        : 'rgba(156,163,175,0.15)'
                                                }}
                                            />
                                            {h.hour % 4 === 0 && (
                                                <span className="text-[7px] font-black text-gray-400 dark:text-gray-500">{h.hour}h</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-3">Hover cells to see order count per hour</p>
                        </div>
                    </div>

                    {/* ── Top Products + ABC Classification ── */}
                    {abcInventory && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-green-600 rounded-full" />
                                    Product ABC Analysis
                                </h3>
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase">
                                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> A: Top Drivers</span>
                                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> B: Steady</span>
                                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> C: Dead Stock</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {abcInventory.map((p: any, i: number) => {
                                    const tierColor = p.tier === 'A' ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' : p.tier === 'B' ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'bg-red-100 dark:bg-red-950/50 text-red-500 dark:text-red-400';
                                    const barColor = p.tier === 'A' ? '#22c55e' : p.tier === 'B' ? '#f59e0b' : '#f87171';
                                    const maxRev = abcInventory[0]?.revenue || 1;
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 rounded-2xl transition-colors group">
                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${tierColor}`}>{p.tier}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-black text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                                                    <p className="font-black text-gray-700 dark:text-gray-300 text-sm shrink-0 ml-4">₦{Number(p.revenue).toLocaleString()}</p>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                                    <div
                                                        className="h-1.5 rounded-full transition-all duration-500"
                                                        style={{ width: `${Math.max(2, (p.revenue / maxRev) * 100)}%`, backgroundColor: barColor }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">{p.qty} units sold</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Staff Performance Leaderboard ── */}
                    {data.staffLeaderboard?.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <Award size={14} className="text-amber-500" />
                                Cashier Performance Leaderboard
                            </h3>
                            <div className="space-y-3">
                                {data.staffLeaderboard.map((s: any, i: number) => {
                                    const maxRev = data.staffLeaderboard[0]?.revenue || 1;
                                    const pct = Math.max(2, Math.round((s.revenue / maxRev) * 100));
                                    return (
                                        <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/60 rounded-2xl transition-colors">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${i === 0 ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : i === 1 ? 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300' : i === 2 ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400' : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-gray-500'}`}>
                                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="font-black text-gray-900 dark:text-white text-sm truncate">{s.name}</p>
                                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{s.sales} txns</span>
                                                        <span className="font-black text-gray-900 dark:text-white text-sm">₦{Number(s.revenue).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                                    <div
                                                        className="h-1.5 rounded-full bg-amber-400 transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Revenue Trend Indicators ── */}
                    {data.dailyRevenue?.length >= 2 && (() => {
                        const sorted = [...data.dailyRevenue].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const latest = Number(sorted[0]?.revenue || 0);
                        const prev = Number(sorted[1]?.revenue || 0);
                        const delta = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
                        const isUp = delta >= 0;
                        return (
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm p-8">
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-purple-600 rounded-full" />
                                    Day-over-Day Revenue Trend
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isUp ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'}`}>
                                        {isUp
                                            ? <ArrowUpRight size={28} className="text-green-600 dark:text-green-400" />
                                            : <ArrowDownRight size={28} className="text-red-500 dark:text-red-400" />
                                        }
                                    </div>
                                    <div>
                                        <p className={`text-2xl font-black ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                            {isUp ? '+' : ''}{delta.toFixed(1)}%
                                        </p>
                                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-0.5">
                                            Latest day: ₦{latest.toLocaleString()} vs previous ₦{prev.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}

            {!loading && data && data.summary.totalOrders === 0 && (
                <div className="bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-gray-700 rounded-[2rem] p-16 text-center">
                    <BarChart2 size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest text-sm">No orders found for this period</p>
                    <p className="text-gray-400 dark:text-gray-600 text-xs mt-2">Try selecting a wider time range or a different date window.</p>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
