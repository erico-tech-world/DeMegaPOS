import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC<{ allowedRoles?: string[] }> = ({ allowedRoles }) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 border-4 border-green-900/10 border-t-[#2D7A3E] rounded-full animate-spin"></div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Authenticating Secure Channel</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth/login" replace />;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export const PublicOnlyRoute: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return null;

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};
