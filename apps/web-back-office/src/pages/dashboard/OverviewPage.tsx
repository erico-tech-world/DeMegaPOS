import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingCart, AlertTriangle, Users, Package } from 'lucide-react';
import { StatCard, OrdersView } from '../../components/DashboardComponents';

interface OverviewPageProps {
    products: any[];
    orders: any[];
    staff: any[];
    isLoading: boolean;
}

const OverviewPage = ({ products, orders, staff, isLoading }: OverviewPageProps) => {
    const navigate = useNavigate();

    // Logic for Today's Sales - Ensure numerical addition and existence
    const todaySales = Array.isArray(orders) ? orders.reduce((acc: number, o: any) => acc + Number(o?.totalAmount || 0), 0) : 0;
    const activeOrdersCount = Array.isArray(orders) ? orders.length : 0;

    // FIFO Logic: Show last 7 items
    const recentActivity = Array.isArray(orders) ? [...orders].reverse().slice(0, 7) : [];
    const inventoryGlance = Array.isArray(products) ? products.slice(0, 7) : [];
    const lowStockCount = Array.isArray(products) ? products.filter((p: any) => (p?.stock || 0) < 10).length : 0;
    const staffCount = Array.isArray(staff) ? staff.length : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Sales"
                    value={`₦${todaySales.toLocaleString()}`}
                    change="+12.5%"
                    trend="up"
                    icon={TrendingUp}
                />
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
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
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-gray-300 border border-gray-100 shadow-sm group-hover:text-[#8B1538] transition-colors"><Package size={20} /></div>
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
        </div>
    );
};

export default OverviewPage;
