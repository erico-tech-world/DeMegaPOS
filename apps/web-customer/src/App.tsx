import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  CheckCircle2,
  ChefHat,
  Package
} from 'lucide-react';

// Responsive Status Column Component
const StatusColumn = ({ title, orders, colorClass, icon: Icon, isMobile }: any) => (
  <div className={`flex-1 flex flex-col ${isMobile ? 'min-h-[300px]' : 'h-full'} bg-slate-900/50 rounded-2xl sm:rounded-3xl border border-slate-800 p-4 sm:p-6 lg:p-8`}>
    {/* Column Header */}
    <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-6 lg:mb-10">
      <div className={`${colorClass} p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl shadow-lg`}>
        <Icon size={20} className="sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
      </div>
      <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">{title}</h2>
    </div>

    {/* Orders Grid */}
    <div className="flex-1 overflow-y-auto">
      <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6'}`}>
        {orders.map((order: any) => (
          <div
            key={order.id}
            className="bg-slate-800 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-700 shadow-xl flex items-center justify-center animate-in fade-in zoom-in duration-500 hover:scale-105 transition-transform"
            style={{ minHeight: '80px' }}
          >
            <span className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-slate-100">
              #{order.id.slice(-3)}
            </span>
          </div>
        ))}

        {/* Empty State */}
        {orders.length === 0 && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-3 py-12 sm:py-20 flex flex-col items-center justify-center opacity-20">
            <Clock size={32} className="sm:w-12 sm:h-12" />
            <p className="mt-3 sm:mt-4 font-bold text-base sm:text-xl">Waiting...</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  const [orders, setOrders] = useState([
    { id: "ORD-042", status: "PREPARING" },
    { id: "ORD-045", status: "PREPARING" },
    { id: "ORD-047", status: "PREPARING" },
    { id: "ORD-038", status: "READY" },
    { id: "ORD-039", status: "READY" },
  ]);

  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mock real-time updates
  useEffect(() => {
    const timer = setInterval(() => {
      setOrders(prev => {
        const preparing = prev.filter(o => o.status === 'PREPARING');
        if (preparing.length > 0) {
          const toReady = preparing[Math.floor(Math.random() * preparing.length)];
          return prev.map(o => o.id === toReady.id ? { ...o, status: 'READY' } : o);
        }
        return prev;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const readyOrders = orders.filter(o => o.status === 'READY');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Responsive Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 shadow-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div className="bg-white p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-500/20 overflow-hidden">
                <img src="/logo.png" alt="DeMega Logo" className="h-12 sm:h-16 lg:h-20 w-auto object-contain" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black tracking-tighter">ORDER STATUS</h1>
                <p className="text-slate-400 text-xs sm:text-base lg:text-2xl font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">
                  DeMega POS • Real-time Board
                </p>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center space-x-3 bg-slate-800/50 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-700">
              <div className="relative">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#2D7A3E] rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 bg-[#2D7A3E] rounded-full animate-ping"></div>
              </div>
              <span className="font-black text-sm sm:text-base lg:text-xl text-slate-200 uppercase tracking-wider">LIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {isMobile ? (
          // Mobile: Stacked Layout
          <div className="space-y-6">
            <StatusColumn
              title="PREPARING"
              orders={preparingOrders}
              colorClass="bg-amber-500"
              icon={ChefHat}
              isMobile={true}
            />
            <StatusColumn
              title="READY"
              orders={readyOrders}
              colorClass="bg-[#2D7A3E]"
              icon={CheckCircle2}
              isMobile={true}
            />
          </div>
        ) : (
          // Desktop/Tablet: Side-by-side Layout
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 h-[calc(100vh-200px)]">
            <StatusColumn
              title="PREPARING"
              orders={preparingOrders}
              colorClass="bg-amber-500"
              icon={ChefHat}
              isMobile={false}
            />
            <StatusColumn
              title="READY"
              orders={readyOrders}
              colorClass="bg-[#2D7A3E]"
              icon={CheckCircle2}
              isMobile={false}
            />
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Total Orders</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{orders.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Preparing</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-500">{preparingOrders.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Ready</p>
            <p className="text-2xl sm:text-3xl font-black text-[#2D7A3E]">{readyOrders.length}</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center">
            <p className="text-slate-400 text-xs sm:text-sm font-medium mb-1">Avg. Time</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-500">12m</p>
          </div>
        </div>
      </main>
    </div>
  );
}
