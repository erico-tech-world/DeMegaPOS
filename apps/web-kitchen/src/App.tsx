import { useState, useEffect } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Filter
} from 'lucide-react';

// Responsive Order Card Component
const OrderCard = ({ order, onStatusChange }: any) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - order.createdAt) / 1000 / 60));
    }, 60000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const getStatusColor = () => {
    switch (order.status) {
      case 'NEW': return 'bg-blue-600';
      case 'PREPARING': return 'bg-amber-500';
      case 'READY': return 'bg-[#2D7A3E]';
      default: return 'bg-slate-600';
    }
  };

  const getUrgencyBorder = () => {
    if (timeElapsed > 15) return 'border-red-500 border-2';
    if (timeElapsed > 10) return 'border-amber-500 border-2';
    return 'border-slate-700';
  };

  return (
    <div className={`bg-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all ${getUrgencyBorder()}`}>
      {/* Header */}
      <div className={`${getStatusColor()} p-3 sm:p-4 flex justify-between items-center`}>
        <span className="font-black text-lg sm:text-xl">#{order.id.slice(-4)}</span>
        <div className="flex items-center space-x-2 bg-black/20 px-2 sm:px-3 py-1 rounded-full">
          <Clock size={14} className="sm:w-4 sm:h-4" />
          <span className="font-bold text-sm sm:text-base">{timeElapsed}m</span>
        </div>
      </div>

      {/* Items List */}
      <div className={`p-4 sm:p-6 ${!isExpanded && 'max-h-32 sm:max-h-none overflow-hidden'}`}>
        <ul className="space-y-2 sm:space-y-3">
          {order.items.map((item: any, idx: number) => (
            <li
              key={item.id}
              className={`flex justify-between items-start border-b border-slate-700 pb-2 last:border-0 ${!isExpanded && idx > 1 ? 'hidden sm:flex' : 'flex'}`}
            >
              <div className="flex-1">
                <span className="text-xl sm:text-2xl font-bold text-slate-100">{item.quantity}x</span>
                <span className="ml-2 sm:ml-3 text-base sm:text-xl text-slate-300">Product #{item.productId}</span>
              </div>
            </li>
          ))}
        </ul>

        {/* Mobile Expand Button */}
        {order.items.length > 2 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="sm:hidden mt-2 text-sm text-slate-400 hover:text-slate-200"
          >
            {isExpanded ? 'Show less' : `+${order.items.length - 2} more items`}
          </button>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onStatusChange(order)}
        className="m-3 sm:m-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 py-3 sm:py-4 rounded-lg sm:rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-95 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)]"
        style={{ minHeight: '48px' }}
      >
        {order.status === 'NEW' && <><ChefHat size={18} className="sm:w-5 sm:h-5" /> <span className="font-bold text-sm sm:text-base">Start Preparing</span></>}
        {order.status === 'PREPARING' && <><CheckCircle2 size={18} className="sm:w-5 sm:h-5" /> <span className="font-bold text-sm sm:text-base">Mark as Ready</span></>}
        {order.status === 'READY' && <><CheckCircle2 size={18} className="sm:w-5 sm:h-5" /> <span className="font-bold text-sm sm:text-base">Complete Order</span></>}
      </button>
    </div>
  );
};

export default function App() {
  const [orders, setOrders] = useState([
    {
      id: "ord_1",
      status: "NEW",
      createdAt: Date.now() - 300000,
      items: [
        { id: "i1", productId: "P001", quantity: 2 },
        { id: "i2", productId: "P005", quantity: 1 }
      ]
    },
    {
      id: "ord_2",
      status: "PREPARING",
      createdAt: Date.now() - 600000,
      items: [
        { id: "i3", productId: "P003", quantity: 3 },
        { id: "i4", productId: "P007", quantity: 2 }
      ]
    },
    {
      id: "ord_3",
      status: "READY",
      createdAt: Date.now() - 900000,
      items: [{ id: "i5", productId: "P002", quantity: 1 }]
    },
  ]);

  const [filter, setFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const handleStatusChange = (order: any) => {
    setOrders(orders.map(o => {
      if (o.id === order.id) {
        if (o.status === 'NEW') return { ...o, status: 'PREPARING' };
        if (o.status === 'PREPARING') return { ...o, status: 'READY' };
        return o;
      }
      return o;
    }));
  };

  const filteredOrders = filter === 'ALL'
    ? orders
    : orders.filter(o => o.status === filter);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Responsive Header */}
      <header className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
                <img src="/logo.png" alt="DeMega Logo" className="h-10 sm:h-12 lg:h-16 w-auto object-contain" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">KITCHEN DISPLAY</h1>
                <p className="text-slate-400 text-xs sm:text-sm font-bold uppercase tracking-wider">DeMega POS • Main Station</p>
              </div>
            </div>

            {/* Filter Button - Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg"
              style={{ minHeight: '44px' }}
            >
              <Filter size={18} />
              <span className="font-medium">Filter: {filter}</span>
            </button>

            {/* Filters - Desktop */}
            <div className="hidden sm:flex space-x-2">
              {['ALL', 'NEW', 'PREPARING', 'READY'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === status
                    ? 'bg-[#2D7A3E] text-white shadow-md'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  style={{ minHeight: '44px' }}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Filter Dropdown */}
          {showFilters && (
            <div className="sm:hidden mt-3 bg-slate-800 rounded-lg p-2 space-y-1">
              {['ALL', 'NEW', 'PREPARING', 'READY'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilter(status);
                    setShowFilters(false);
                  }}
                  className={`w-full px-4 py-2 rounded-lg font-bold text-sm transition-all ${filter === status
                    ? 'bg-[#2D7A3E] text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  style={{ minHeight: '44px' }}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Orders Grid - Responsive */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24">
            <ChefHat size={64} className="text-slate-700 mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-slate-400">No {filter.toLowerCase()} orders</h3>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">Orders will appear here when they arrive</p>
          </div>
        )}
      </main>
    </div>
  );
}
