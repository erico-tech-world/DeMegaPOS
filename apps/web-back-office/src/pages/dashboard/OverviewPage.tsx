import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingCart, AlertTriangle, Users, Package, RotateCcw, X, Loader2, CalendarRange, Monitor, Archive, UserCircle, BarChart2, Settings as SettingsIcon } from 'lucide-react';
import { StatCard, OrdersView } from '../../components/DashboardComponents';
import { useAuth } from '../../context/AuthContext';

interface OverviewPageProps {
    products: any[];
    orders: any[];
    staff: any[];
    dashboardSummary?: any;
    isLoading: boolean;
    resetFinancials: (storeId?: string) => Promise<{ deleted: number; message: string }>;
    refresh?: () => Promise<void> | void;
}

const ELEVATED_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN'];

const OverviewPage = ({ products, orders, staff, dashboardSummary, isLoading, resetFinancials, refresh }: OverviewPageProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        if (refresh) {
            refresh();
        }
    }, []);

    const isElevated = ELEVATED_ROLES.includes(user?.role || '');

    // ── Today's Net Sales ────────────────────────────────────────────────────────
    const todayStr = new Date().toDateString();
    const fallbackTodaySales = Array.isArray(orders)
        ? orders
              .filter((o: any) => {
                  const isToday = o?.createdAt && new Date(o.createdAt).toDateString() === todayStr;
                  const isPaid = o?.paymentStatus === 'SUCCESS' || o?.paymentStatus === 'PAID';
                  // Cashiers see only their own shift
                  if (!isElevated) return isToday && isPaid && o.cashierId === (user as any)?.id;
                  return isToday && isPaid;
              })
              .reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0)
        : 0;
    const todaySales = dashboardSummary?.today?.netSales !== undefined
        ? Number(dashboardSummary.today.netSales)
        : fallbackTodaySales;

    // ── All-Time Net Sales (Admins/Managers only) ────────────────────────────────
    const fallbackAllTimeSales = Array.isArray(orders)
        ? orders
              .filter((o: any) => o?.paymentStatus === 'SUCCESS' || o?.paymentStatus === 'PAID')
              .reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0)
        : 0;
    const allTimeSales = dashboardSummary?.allTime?.netSales !== undefined
        ? Number(dashboardSummary.allTime.netSales)
        : fallbackAllTimeSales;

    // ── Monthly Net Sales (current calendar month, elevated roles only) ──────────
    const now = new Date();
    const fallbackMonthlySales = Array.isArray(orders)
        ? orders
              .filter((o: any) => {
                  if (!o?.createdAt) return false;
                  const isPaid = o?.paymentStatus === 'SUCCESS' || o?.paymentStatus === 'PAID';
                  const d = new Date(o.createdAt);
                  return isPaid && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
              })
              .reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0)
        : 0;
    const monthlySales = dashboardSummary?.monthly?.netSales !== undefined
        ? Number(dashboardSummary.monthly.netSales)
        : fallbackMonthlySales;

    // ── Cashier's Own Orders (shift-scoped) ──────────────────────────────────────
    const cashierOrders = Array.isArray(orders)
        ? orders.filter((o: any) => !isElevated ? o.cashierId === (user as any)?.id : true)
        : [];

    const activeOrdersCount = dashboardSummary?.activeOrdersCount !== undefined
        ? Number(dashboardSummary.activeOrdersCount)
        : (Array.isArray(orders) ? orders.filter((o: any) => o?.paymentStatus !== 'REFUNDED').length : 0);



    const inventoryGlance = Array.isArray(products) ? products.slice(0, 7) : [];
    const lowStockCount = Array.isArray(products) ? products.filter((p: any) => (p?.stock || 0) < 10).length : 0;
    const staffCount = Array.isArray(staff) ? staff.length : 0;

    // Scope recent activity for cashiers to their own orders only
    const scopedOrders = isElevated ? orders : cashierOrders;
    const recentActivity = Array.isArray(scopedOrders)
        ? [...scopedOrders]
              .sort((a: any, b: any) => {
                  const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA;
              })
              .slice(0, 7)
        : [];

    // ── Reset Financials Modal State ─────────────────────────────────────────────
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState<string | null>(null);

    const handleResetFinancials = async () => {
        if (resetConfirmText !== 'RESET') return;
        setResetLoading(true);
        try {
            const result = await resetFinancials();
            setResetResult(result.message);
            setTimeout(() => {
                setShowResetModal(false);
                setResetResult(null);
                setResetConfirmText('');
            }, 2500);
        } catch {
            setResetResult('Error: Failed to reset financial records. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    const quickActions = [
        { id: 'qa-pos', label: 'POS Terminal', icon: Monitor, path: '/pos', color: 'from-[#2D7A3E] to-emerald-600', light: 'bg-emerald-50 text-emerald-700', desc: 'Open cashier terminal' },
        { id: 'qa-inventory', label: 'Inventory', icon: Package, path: '/inventory', color: 'from-blue-600 to-blue-700', light: 'bg-blue-50 text-blue-700', desc: 'Manage stock & products' },
        { id: 'qa-orders', label: 'Order History', icon: Archive, path: '/orders', color: 'from-violet-600 to-violet-700', light: 'bg-violet-50 text-violet-700', desc: 'View all transactions' },
        { id: 'qa-customers', label: 'Customers', icon: UserCircle, path: '/customers', color: 'from-orange-500 to-orange-600', light: 'bg-orange-50 text-orange-700', desc: 'CRM & client records' },
        { id: 'qa-analytics', label: 'Analytics', icon: BarChart2, path: '/analytics', color: 'from-pink-500 to-rose-600', light: 'bg-pink-50 text-pink-700', desc: 'Revenue & insights' },
        { id: 'qa-settings', label: 'Settings', icon: SettingsIcon, path: '/settings', color: 'from-gray-600 to-gray-700', light: 'bg-gray-100 text-gray-700', desc: 'Configure your system' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Stat Cards ── */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isElevated ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
                {/* Today's Net Sales (all roles) */}
                <StatCard
                    title="Today's Net Sales"
                    value={`₦${todaySales.toLocaleString()}`}
                    change=""
                    trend="up"
                    icon={TrendingUp}
                />

                {/* Monthly Net Sales (elevated roles only) */}
                {isElevated && (
                    <StatCard
                        title={`${MONTH_NAMES[now.getMonth()]} Net Sales`}
                        value={`₦${monthlySales.toLocaleString()}`}
                        change=""
                        trend="up"
                        icon={CalendarRange}
                    />
                )}

                {/* Total All-Time Net Sales (Admins/Managers only) */}
                {isElevated && (
                    <div className="relative">
                        <StatCard
                            title="Total Net Sales (All Time)"
                            value={`₦${allTimeSales.toLocaleString()}`}
                            change=""
                            trend="up"
                            icon={TrendingUp}
                        />
                        {/* Reset Financials trigger button */}
                        <button
                            id="reset-financials-btn"
                            onClick={() => { setShowResetModal(true); setResetConfirmText(''); setResetResult(null); }}
                            title="Reset Financial Records"
                            className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 transition-all"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                )}

                <StatCard
                    title="Active Orders"
                    value={activeOrdersCount}
                    change=""
                    trend="up"
                    icon={ShoppingCart}
                />
                <StatCard
                    title="Inventory Alerts"
                    value={lowStockCount}
                    change="-2"
                    trend="down"
                    icon={AlertTriangle}
                />
                <StatCard
                    title="Total Staff"
                    value={staffCount}
                    change="+1"
                    trend="up"
                    icon={Users}
                />
            </div>

            {/* ── Quick Actions Shortcut Bar ── */}
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <div className="w-1 h-4 bg-[#2D7A3E] rounded-full"></div>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {quickActions.map((qa) => (
                        <button
                            key={qa.id}
                            id={qa.id}
                            onClick={() => navigate(qa.path)}
                            className="group flex flex-col items-center gap-3 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:scale-[1.04] hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-600 active:scale-95 transition-all duration-200"
                        >
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${qa.light} group-hover:bg-gradient-to-br group-hover:${qa.color} group-hover:text-white transition-all duration-200`}>
                                <qa.icon size={20} />
                            </div>
                            <div className="text-center">
                                <div className="text-[11px] font-black text-gray-900 dark:text-gray-100 leading-none">{qa.label}</div>
                                <div className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 leading-tight">{qa.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Content Grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Recent Activity (FIFO — newest on top) */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#2D7A3E] rounded-full"></div>
                            Recent Activity
                        </h3>
                        {Array.isArray(orders) && orders.length >= 7 && (
                            <button
                                onClick={() => navigate('/orders')}
                                className="text-xs font-black text-[#2D7A3E] dark:text-green-400 hover:underline uppercase tracking-widest"
                            >
                                See More
                            </button>
                        )}
                    </div>
                    <div className="flex-1">
                        <OrdersView
                            orders={recentActivity}
                            isLoading={isLoading}
                            onItemClick={(order: any) => navigate(`/orders?id=${order.id}`)}
                        />
                    </div>
                </div>

                {/* Inventory Glance */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#8B1538] rounded-full"></div>
                            Inventory Glance
                        </h3>
                        {products.length >= 7 && (
                            <button
                                onClick={() => navigate('/inventory')}
                                className="text-xs font-black text-[#8B1538] dark:text-rose-400 hover:underline uppercase tracking-widest"
                            >
                                See More
                            </button>
                        )}
                    </div>
                    <div className="space-y-4 flex-1">
                        {inventoryGlance.map((p: any) => (
                            <div
                                key={p.id}
                                onClick={() => navigate(`/inventory?productId=${p.id}`)}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/80 rounded-2xl group hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-xl flex items-center justify-center font-bold text-gray-300 dark:text-gray-400 border border-gray-100 dark:border-gray-600 shadow-sm group-hover:text-[#8B1538] transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm text-gray-900 dark:text-white">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Units: {p.stock}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-gray-900 dark:text-white">₦{(Number(p?.price) || 0).toLocaleString()}</div>
                                    <div className={`text-[8px] font-black uppercase mt-1 ${(p?.stock || 0) < 10 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                                        {(p?.stock || 0) < 10 ? 'Low Stock' : 'Optimized'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Reset Financials Confirmation Modal ── */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 relative border border-gray-100 dark:border-gray-800">
                        <button
                            onClick={() => setShowResetModal(false)}
                            className="absolute top-5 right-5 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                <RotateCcw size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900 dark:text-white">Reset Financial Records</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This action is <span className="font-black text-red-500">permanent</span> and cannot be undone.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-2xl p-4 text-sm text-red-700 dark:text-red-400 font-medium">
                            ⚠️ This will permanently delete all completed order records, split payments, and terminal transaction logs. Draft orders will be preserved.
                        </div>

                        {resetResult ? (
                            <div className={`rounded-2xl p-4 text-sm font-bold ${resetResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {resetResult}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">
                                    Type <span className="font-black text-red-500 font-mono">RESET</span> to confirm:
                                </label>
                                <input
                                    id="reset-confirm-input"
                                    type="text"
                                    value={resetConfirmText}
                                    onChange={(e) => setResetConfirmText(e.target.value)}
                                    placeholder="RESET"
                                    className="w-full border-2 border-gray-200 dark:border-gray-700 dark:bg-slate-800 dark:text-white rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:border-red-400 transition-colors"
                                    autoFocus
                                />
                                <button
                                    id="reset-confirm-btn"
                                    onClick={handleResetFinancials}
                                    disabled={resetConfirmText !== 'RESET' || resetLoading}
                                    className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-red-500 hover:bg-red-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black rounded-xl transition-all text-sm"
                                >
                                    {resetLoading ? (
                                        <><Loader2 size={16} className="animate-spin" /> Resetting...</>
                                    ) : (
                                        <><RotateCcw size={16} /> Confirm Reset</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OverviewPage;
