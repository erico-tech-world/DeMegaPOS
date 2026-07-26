import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingCart, AlertTriangle, Users, Package, RotateCcw, X, Loader2 } from 'lucide-react';
import { StatCard, OrdersView } from '../../components/DashboardComponents';
import { useAuth } from '../../context/AuthContext';

interface OverviewPageProps {
    products: any[];
    orders: any[];
    staff: any[];
    isLoading: boolean;
    resetFinancials: (storeId?: string) => Promise<{ deleted: number; message: string }>;
}

const ELEVATED_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN'];

const OverviewPage = ({ products, orders, staff, isLoading, resetFinancials }: OverviewPageProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const isElevated = ELEVATED_ROLES.includes(user?.role || '');

    // ── Today's Sales ────────────────────────────────────────────────────────────
    const todayStr = new Date().toDateString();
    const todaySales = Array.isArray(orders)
        ? orders
              .filter((o: any) => o?.createdAt && new Date(o.createdAt).toDateString() === todayStr)
              .reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0)
        : 0;

    // ── All-Time Sales (Admins/Managers only) ────────────────────────────────────
    const allTimeSales = Array.isArray(orders)
        ? orders.reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0)
        : 0;

    const activeOrdersCount = Array.isArray(orders) ? orders.length : 0;

    // ── FIFO Recent Activity: sort by createdAt descending, take top 7 ──────────
    const recentActivity = Array.isArray(orders)
        ? [...orders]
              .sort((a: any, b: any) => {
                  const dateA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const dateB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return dateB - dateA; // newest first
              })
              .slice(0, 7)
        : [];

    const inventoryGlance = Array.isArray(products) ? products.slice(0, 7) : [];
    const lowStockCount = Array.isArray(products) ? products.filter((p: any) => (p?.stock || 0) < 10).length : 0;
    const staffCount = Array.isArray(staff) ? staff.length : 0;

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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ── Stat Cards ── */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isElevated ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
                {/* Today's Sales (all roles) */}
                <StatCard
                    title="Today's Sales"
                    value={`₦${todaySales.toLocaleString()}`}
                    change="+12.5%"
                    trend="up"
                    icon={TrendingUp}
                />

                {/* Total All-Time Sales (Admins/Managers only) */}
                {isElevated && (
                    <div className="relative">
                        <StatCard
                            title="Total Sales (All Time)"
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
                    change="+5.2%"
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

            {/* ── Content Grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Recent Activity (FIFO — newest on top) */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#2D7A3E] rounded-full"></div>
                            Recent Activity
                        </h3>
                        {Array.isArray(orders) && orders.length >= 7 && (
                            <button
                                onClick={() => navigate('/orders')}
                                className="text-xs font-black text-[#2D7A3E] hover:underline uppercase tracking-widest"
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
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-[#8B1538] rounded-full"></div>
                            Inventory Glance
                        </h3>
                        {products.length >= 7 && (
                            <button
                                onClick={() => navigate('/inventory')}
                                className="text-xs font-black text-[#8B1538] hover:underline uppercase tracking-widest"
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
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white border border-transparent hover:border-gray-100 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-gray-300 border border-gray-100 shadow-sm group-hover:text-[#8B1538] transition-colors">
                                        <Package size={20} />
                                    </div>
                                    <div>
                                        <div className="font-black text-sm text-gray-900">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Units: {p.stock}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-gray-900">₦{(Number(p?.price) || 0).toLocaleString()}</div>
                                    <div className={`text-[8px] font-black uppercase mt-1 ${(p?.stock || 0) < 10 ? 'text-red-500' : 'text-green-500'}`}>
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
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md mx-4 p-8 space-y-6 relative">
                        <button
                            onClick={() => setShowResetModal(false)}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
                                <RotateCcw size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-gray-900">Reset Financial Records</h2>
                                <p className="text-sm text-gray-500 mt-1">This action is <span className="font-black text-red-500">permanent</span> and cannot be undone.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-red-700 font-medium">
                            ⚠️ This will permanently delete all completed order records, split payments, and terminal transaction logs. Draft orders will be preserved.
                        </div>

                        {resetResult ? (
                            <div className={`rounded-2xl p-4 text-sm font-bold ${resetResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {resetResult}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-gray-700">
                                    Type <span className="font-black text-red-500 font-mono">RESET</span> to confirm:
                                </label>
                                <input
                                    id="reset-confirm-input"
                                    type="text"
                                    value={resetConfirmText}
                                    onChange={(e) => setResetConfirmText(e.target.value)}
                                    placeholder="RESET"
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:border-red-400 transition-colors"
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
