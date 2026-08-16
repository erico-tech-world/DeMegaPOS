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
    UserSquare2,
    CreditCard,
    BarChart2,
    Sun,
    Moon,
    WifiOff,
    GitBranch
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { API_URL } from '../lib/apiConfig';

const AppLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string>(() => localStorage.getItem('selectedBranchId') || '');
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const activeTab = location.pathname.split('/')[1] || 'dashboard';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;
        axios.get(`${API_URL}/tenants/branches`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                setBranches(res.data);
                if (!localStorage.getItem('selectedBranchId') && res.data.length > 0) {
                    setSelectedBranch(res.data[0].id);
                    localStorage.setItem('selectedBranchId', res.data[0].id);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

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

    const ADMIN_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN'];
    const userRole = (user as any)?.role || '';

    const allMenuItems = [
        { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: '#2D7A3E', path: '/dashboard', roles: null },
        { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, color: '#2D7A3E', path: '/pos', roles: null },
        { id: 'inventory', label: 'Inventory', icon: Package, color: '#8B1538', path: '/inventory', roles: null },
        { id: 'orders', label: 'Order History', icon: Package, color: '#2D7A3E', path: '/orders', roles: null },
        { id: 'customers', label: 'Customers', icon: UserSquare2, color: '#2D7A3E', path: '/customers', roles: null },
        { id: 'analytics', label: 'Analytics', icon: BarChart2, color: '#7C3AED', path: '/analytics', roles: ADMIN_ROLES },
        { id: 'multi-branch', label: 'Multi-Branch View', icon: GitBranch, color: '#6366F1', path: '/analytics/multi-branch', roles: ['SUPER_ADMIN', 'OWNER'] },
        { id: 'staff', label: 'Staff Management', icon: Users, color: '#2D7A3E', path: '/staff', roles: ADMIN_ROLES },
        { id: 'integrations', label: 'Integrations', icon: CreditCard, color: '#2D7A3E', path: '/integrations', roles: ADMIN_ROLES },
        { id: 'settings', label: 'Settings', icon: Settings, color: '#64748B', path: '/settings', roles: ADMIN_ROLES },
    ];

    const menuItems = allMenuItems.filter(item =>
        !item.roles || item.roles.includes(userRole)
    );

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden">
            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-300 ease-in-out shadow-2xl shadow-gray-900/5
                    ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-72' : (isSidebarOpen ? 'w-72' : 'w-20')}
                    ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
                `}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="w-10 h-10 bg-[#2D7A3E] rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg shadow-green-900/20">
                            <LayoutDashboard className="text-white" size={22} />
                        </div>
                        {(isSidebarOpen || isMobile) && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                                <span className="font-black text-gray-900 dark:text-white leading-none tracking-tight">DeMega<span className="text-[#2D7A3E]">POS</span></span>
                                <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Branch Engine</span>
                            </div>
                        )}
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const isMultiBranch = location.pathname === '/analytics/multi-branch' || location.pathname === '/multi-branch';
                        const isActive = item.id === 'multi-branch'
                            ? isMultiBranch
                            : (item.id === 'analytics'
                                ? (location.pathname === '/analytics' && !isMultiBranch)
                                : activeTab === item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    navigate(item.path);
                                    if (isMobile) setIsSidebarOpen(false);
                                }}
                                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all group relative ${
                                    isActive
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl shadow-gray-900/20'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <item.icon size={22} className={`flex-shrink-0 ${
                                    isActive
                                        ? 'text-white dark:text-gray-900'
                                        : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                                }`} />
                                {(isSidebarOpen || isMobile) && (
                                    <span className={`font-black text-sm tracking-tight truncate ${isActive ? 'text-white dark:text-gray-900' : ''}`}>{item.label}</span>
                                )}
                                {isActive && (isSidebarOpen || isMobile) && (
                                    <ChevronRight size={16} className="absolute right-4 opacity-50" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-50 dark:border-gray-800 space-y-2">
                    {user && (isSidebarOpen || isMobile) && (
                        <div className="flex items-center space-x-3 px-4 py-3 mb-2 bg-gray-50 dark:bg-gray-800/60 rounded-2xl">
                            <div className="w-8 h-8 bg-white dark:bg-gray-700 rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-200 dark:border-gray-600 shadow-sm">
                                <UserIcon size={16} className="text-gray-400 dark:text-gray-200" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-black text-gray-900 dark:text-white truncate">{user.name}</span>
                                <span className="text-[10px] font-bold text-[#2D7A3E]">{user.role}</span>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group"
                    >
                        <LogOut size={22} className="flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                        {(isSidebarOpen || isMobile) && <span className="font-black text-sm tracking-tight">Sign Out Engine</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 relative transition-all duration-300 ${!isMobile && isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
                {/* Header */}
                <header className="h-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 sm:px-10 sticky top-0 z-20 transition-colors">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Menu size={20} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight capitalize leading-tight">{activeTab}</h2>
                            <span className="block sm:hidden text-[9px] font-black text-gray-400 uppercase tracking-widest">Enterprise Command</span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* User-Scoped Theme Switcher Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
                            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                        >
                            {theme === 'light' ? (
                                <Moon size={18} className="text-gray-700" />
                            ) : (
                                <Sun size={18} className="text-amber-400" />
                            )}
                            <span className="hidden sm:inline text-xs font-black uppercase tracking-wider">
                                {theme === 'light' ? 'Dark' : 'Light'}
                            </span>
                        </button>

                        {/* Branch Switcher (Strict RBAC: visible ONLY to SUPER_ADMIN and OWNER) */}
                        {['SUPER_ADMIN', 'OWNER'].includes(userRole) ? (
                            <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-gray-400">Branch:</span>
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => {
                                        setSelectedBranch(e.target.value);
                                        localStorage.setItem('selectedBranchId', e.target.value);
                                        window.location.reload();
                                    }}
                                    className="bg-transparent text-xs font-black text-gray-800 dark:text-white outline-none cursor-pointer"
                                >
                                    {branches.map(b => (
                                        <option key={b.id} value={b.id} className="dark:bg-slate-900">
                                            {b.name} ({b.branchCode || 'HQ'})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 px-3.5 py-1.5 rounded-xl text-xs font-black text-gray-700 dark:text-gray-300">
                                <span className="text-[10px] font-black uppercase text-gray-400">Branch:</span>
                                <span>{branches.find(b => b.id === selectedBranch)?.name || (user as any)?.storeName || 'HQ Branch'}</span>
                            </div>
                        )}

                        {isOnline ? (
                            <div className="hidden md:flex items-center space-x-2 bg-green-50 dark:bg-green-950/40 px-4 py-2 rounded-xl border border-green-200 dark:border-green-800/60">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase tracking-widest">System Online</span>
                            </div>
                        ) : (
                            <div className="hidden md:flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/40 px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-400">
                                <WifiOff size={14} className="text-amber-600 dark:text-amber-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">OFFLINE MODE (LOCAL HARDWARE ACTIVE)</span>
                            </div>
                        )}
                        {isMobile && !isSidebarOpen && (
                            <div className="flex flex-col items-end sm:hidden">
                                <span className="text-[10px] font-black text-gray-900 dark:text-white leading-none">DeMega<span className="text-[#2D7A3E]">POS</span></span>
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Mobile View</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
