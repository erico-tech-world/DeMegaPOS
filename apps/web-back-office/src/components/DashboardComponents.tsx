import { ShoppingCart, ChevronRight } from 'lucide-react';

export const StatCard = ({ title, value, change, trend, icon: Icon }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-[#2D7A3E] group-hover:text-white transition-all duration-300">
                <Icon size={24} />
            </div>
            <div className={`text-xs font-black px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {change}
            </div>
        </div>
        <div className="text-2xl font-black text-gray-900 mb-1">{value}</div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</div>
    </div>
);

export const OrdersView = ({ orders, isLoading }: any) => {
    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="py-20 text-center text-gray-400">Loading orders...</div>
            ) : orders.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic">No orders recorded yet.</div>
            ) : orders.map((order: any) => (
                <div key={order.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-[#2D7A3E] transition-all cursor-pointer group">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${order.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            <ShoppingCart size={20} />
                        </div>
                        <div>
                            <div className="text-sm font-black text-gray-900">ORD-{order.id.slice(-5).toUpperCase()}</div>
                            <div className="text-xs text-gray-500">{order.customer?.name || 'Walk-in'} • {new Date(order.createdAt).toLocaleTimeString()}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-sm font-black text-gray-900">₦{order.totalAmount.toLocaleString()}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${order.status === 'COMPLETED' ? 'text-green-500' : 'text-blue-500'
                                }`}>{order.status}</div>
                        </div>
                        <ChevronRight size={20} className="text-gray-300 group-hover:text-[#2D7A3E] transition-colors" />
                    </div>
                </div>
            ))}
        </div>
    );
};
