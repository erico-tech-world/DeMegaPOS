import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

const AuthLayout = () => {
    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 bg-[radial-gradient(#2D7A3E_1px,transparent_1px)] [background-size:32px_32px] [background-opacity:0.05]">
            <div className="mb-8 flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#2D7A3E] rounded-2xl flex items-center justify-center shadow-xl shadow-green-900/20">
                    <LayoutDashboard className="text-white" size={28} />
                </div>
                <Link to="/" className="text-3xl font-black text-[#1A1A1A] tracking-tight">DeMega<span className="text-[#2D7A3E]">POS</span></Link>
            </div>

            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-green-900/5 border border-gray-100 p-10 relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

                <div className="relative z-10">
                    <Outlet />
                </div>
            </div>

            <div className="mt-8 text-sm font-medium text-gray-400">
                Secure authentication powered by DeMega Engines
            </div>
        </div>
    );
};

export default AuthLayout;
