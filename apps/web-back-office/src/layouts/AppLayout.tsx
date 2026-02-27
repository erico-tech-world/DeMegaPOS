import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    User as UserIcon,
    ChevronRight,
    UserSquare2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AppLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const activeTab = location.pathname.split('/')[1] || 'dashboard';

    useEffect(() => {
        const checkMobile = () => {
            const width = window.innerWidth;
            const isSmallScreen = width < 1280;
            setIsMobile(isSmallScreen);
            if (isSmallScreen) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const menuItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: '#2D7A3E', path: '/dashboard' },
        { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, color: '#2D7A3E', path: '/pos' },
        { id: 'inventory', label: 'Inventory', icon: Package, color: '#8B1538', path: '/inventory' },
        { id: 'orders', label: 'Order History', icon: Package, color: '#2D7A3E', path: '/orders' },
        { id: 'customers', label: 'Customers', icon: UserSquare2, color: '#2D7A3E', path: '/customers' },
        { id: 'staff', label: 'Staff Management', icon: Users, color: '#2D7A3E', path: '/staff' },
        { id: 'settings', label: 'Settings', icon: Settings, color: '#64748B', path: '/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-72' : 'w-20'
                    } bg-white border-r border-gray-100 flex flex-col transition-all duration-300 ease-in-out relative z-30 shadow-2xl shadow-gray-900/5 ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#2D7A3E] rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20">
                            <LayoutDashboard className="text-white" size={22} />
                        </div>
                        {(isSidebarOpen || isMobile) && (
                            <div className="flex flex-col">
                                <span className="font-black text-gray-900 leading-none tracking-tight">DeMega<span className="text-[#2D7A3E]">POS</span></span>
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Branch Engine</span>
                            </div>
                        )}
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-50 rounded-lg">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                navigate(item.path);
                                if (isMobile) setIsSidebarOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all group relative ${activeTab === item.id
                                ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20'
                                : 'text-gray-500 hover:bg-gray-50'
                                }`}
                        >
                            <item.icon size={22} className={`${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                            {(isSidebarOpen || isMobile) && (
                                <span className={`font-black text-sm tracking-tight ${activeTab === item.id ? 'text-white' : ''}`}>{item.label}</span>
                            )}
                            {activeTab === item.id && (isSidebarOpen || isMobile) && (
                                <ChevronRight size={16} className="absolute right-4 opacity-50" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-50 space-y-2">
                    {user && (isSidebarOpen || isMobile) && (
                        <div className="flex items-center space-x-3 px-4 py-3 mb-2 bg-gray-50 rounded-2xl">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
                                <UserIcon size={16} className="text-gray-400" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-gray-900 truncate">{user.name}</span>
                                <span className="text-[10px] font-bold text-[#2D7A3E]">{user.role}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all group"
                    >
                        <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
                        {(isSidebarOpen || isMobile) && <span className="font-black text-sm tracking-tight">Sign Out Engine</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-20">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <Menu size={20} className="text-gray-600" />
                        </button>
                        <div className="hidden sm:block">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight capitalize">{activeTab}</h2>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden md:flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">System Online</span>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
