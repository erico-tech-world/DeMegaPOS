import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
    GitBranch, DollarSign, ShoppingBag, TrendingUp, TrendingDown,
    RefreshCw, AlertTriangle, BarChart2, Building2, Award
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Mini StatCard ────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, sub }: any) => (
    <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
            <Icon size={22} style={{ color }} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 truncate">{title}</p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
            {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-bold">{sub}</p>}
        </div>
    </div>
);

// ─── Main Multi-Branch Comparison Page ───────────────────────────────────────
const MultiBranchComparison = () => {
    const [branches, setBranches] = useState<any[]>([]);
    const [branchData, setBranchData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

    const periodMs: Record<string, number> = {
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
    };

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

            const endDate = new Date().toISOString();
            const startDate = new Date(Date.now() - periodMs[period]).toISOString();

            // Fetch analytics for each branch in parallel
            const results = await Promise.allSettled(
                allBranches.map((b: any) =>
                    axios.get(`${API_URL}/orders/analytics`, {
                        params: { startDate, endDate, branchId: b.id },
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
    }, [period]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Consolidated Totals ────────────────────────────────────────────────────
    const consolidated = Object.values(branchData).reduce(
        (acc: any, d: any) => ({
            totalRevenue: acc.totalRevenue + Number(d?.summary?.netRevenue || 0),
            totalOrders: acc.totalOrders + Number(d?.summary?.totalOrders || 0),
            totalProfit: acc.totalProfit + Number(d?.summary?.netProfit || 0),
            totalRefunds: acc.totalRefunds + Number(d?.summary?.totalRefundVolume || 0),
        }),
        { totalRevenue: 0, totalOrders: 0, totalProfit: 0, totalRefunds: 0 }
    );

    const maxRevenue = Math.max(...branches.map(b => Number(branchData[b.id]?.summary?.netRevenue || 0)), 1);

    // ── Per-branch rows sorted by revenue desc ────────────────────────────────
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
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-bold">Consolidated performance intelligence across all branches</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Period selector */}
                    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl">
                        {(['week', 'month', 'year'] as const).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${period === p ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                                {p === 'week' ? '7 Days' : p === 'month' ? '30 Days' : '1 Year'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        className="p-3 bg-white dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all shadow-sm"
                        title="Refresh data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
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
                        <StatCard title="Total Net Revenue" value={`₦${consolidated.totalRevenue.toLocaleString()}`} icon={DollarSign} color="#2D7A3E" sub="All branches combined" />
                        <StatCard title="Total Net Profit" value={`₦${consolidated.totalProfit.toLocaleString()}`} icon={TrendingUp} color="#7C3AED" sub="Gross minus COGS" />
                        <StatCard title="Total Transactions" value={consolidated.totalOrders.toLocaleString()} icon={ShoppingBag} color="#2563EB" sub="Across all branches" />
                        <StatCard title="Total Refund Volume" value={consolidated.totalRefunds.toLocaleString()} icon={TrendingDown} color="#DC2626" sub="All returns combined" />
                    </div>

                    {/* ── Revenue Comparison Bars ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-8">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-5 bg-indigo-600 rounded-full" />
                            Branch Revenue Comparison
                        </h3>
                        {rankedBranches.length === 0 ? (
                            <div className="p-12 text-center text-gray-400 dark:text-gray-600 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl">
                                No branch data found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {rankedBranches.map((b, i) => {
                                    const rev = Number(branchData[b.id]?.summary?.netRevenue || 0);
                                    const orders = Number(branchData[b.id]?.summary?.totalOrders || 0);
                                    const profit = Number(branchData[b.id]?.summary?.netProfit || 0);
                                    const aov = orders > 0 ? (rev / orders) : 0;
                                    const pct = Math.max(2, Math.round((rev / maxRevenue) * 100));
                                    const barColor = i === 0 ? '#7C3AED' : i === 1 ? '#2D7A3E' : i === 2 ? '#2563EB' : '#D97706';

                                    return (
                                        <div key={b.id} className="group">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs text-white`} style={{ backgroundColor: barColor }}>
                                                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 dark:text-white text-sm">{b.name}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{b.location || b.branchCode || 'Omni-location'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0 ml-4">
                                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{orders} txns</span>
                                                    <span className="font-black text-gray-900 dark:text-white text-sm">₦{rev.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5">
                                                <div
                                                    className="h-2.5 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                                                />
                                            </div>
                                            {/* Hover details */}
                                            <div className="hidden group-hover:flex items-center gap-6 mt-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 pl-10">
                                                <span>Profit: <strong className="text-gray-700 dark:text-gray-300">₦{profit.toLocaleString()}</strong></span>
                                                <span>AOV: <strong className="text-gray-700 dark:text-gray-300">₦{aov.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong></span>
                                                <span>Refunds: <strong className="text-red-500">{branchData[b.id]?.summary?.totalRefundVolume || 0}</strong></span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Detailed Per-Branch Table ── */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-100 dark:border-gray-800">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Building2 size={14} className="text-indigo-500" />
                                Detailed Performance Breakdown
                            </h3>
                        </div>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-[10px] uppercase tracking-widest text-gray-400 dark:text-gray-500 font-black border-b border-gray-100 dark:border-gray-800">
                                        <th className="px-8 py-4">Branch</th>
                                        <th className="px-8 py-4 text-right">Transactions</th>
                                        <th className="px-8 py-4 text-right">Gross Revenue</th>
                                        <th className="px-8 py-4 text-right">Net Revenue</th>
                                        <th className="px-8 py-4 text-right">Net Profit</th>
                                        <th className="px-8 py-4 text-right">AOV</th>
                                        <th className="px-8 py-4 text-right">Refund Rate</th>
                                        <th className="px-8 py-4 text-center">Revenue Share</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                    {rankedBranches.map((b, i) => {
                                        const d = branchData[b.id]?.summary || {};
                                        const rev = Number(d.netRevenue || 0);
                                        const orders = Number(d.totalOrders || 0);
                                        const profit = Number(d.netProfit || 0);
                                        const gross = Number(d.grossRevenue || rev);
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
                                                            <p className="font-black text-gray-900 dark:text-white text-sm">{b.name}</p>
                                                            {b.branchCode && <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">Code: {b.branchCode}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-right font-black text-gray-700 dark:text-gray-300">{orders.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right font-bold text-gray-500 dark:text-gray-400 text-sm">₦{gross.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right font-black text-gray-900 dark:text-white text-sm">₦{rev.toLocaleString()}</td>
                                                <td className={`px-8 py-5 text-right font-black text-sm ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                                    ₦{profit.toLocaleString()}
                                                </td>
                                                <td className="px-8 py-5 text-right font-bold text-gray-600 dark:text-gray-400 text-sm">₦{aov.toLocaleString()}</td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${refundRate > 5 ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'}`}>
                                                        {refundRate}%
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-16 bg-gray-100 dark:bg-slate-700 rounded-full h-1.5">
                                                            <div className="h-1.5 bg-indigo-600 rounded-full" style={{ width: `${share}%` }} />
                                                        </div>
                                                        <span className="text-xs font-black text-gray-600 dark:text-gray-400">{share}%</span>
                                                    </div>
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
                                                    <p className="font-black text-gray-900 dark:text-white text-sm truncate">{p.name}</p>
                                                    <span className="font-black text-gray-700 dark:text-gray-300 text-sm shrink-0 ml-4">₦{p.revenue.toLocaleString()}</span>
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
