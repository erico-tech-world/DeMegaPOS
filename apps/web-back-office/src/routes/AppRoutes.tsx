import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicOnlyRoute } from '../components/RoleRoute';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import AcceptInvitePage from '../pages/auth/AcceptInvitePage';
import OverviewPage from '../pages/dashboard/OverviewPage';
import POSPage from '../pages/dashboard/POSPage';
import InventoryPage from '../pages/dashboard/InventoryPage';
import OrdersPage from '../pages/dashboard/OrdersPage';
import CustomersPage from '../pages/dashboard/CustomersPage';
import StaffPage from '../pages/dashboard/StaffPage';
import { useDashboardData } from '../hooks/useDashboardData';

import { IntegrationsPage } from '../pages/IntegrationsPage';

const AppRoutes = () => {
    const dashboardData = useDashboardData();

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Routes (Public Only) */}
            <Route element={<PublicOnlyRoute />}>
                <Route path="/auth" element={<AuthLayout />}>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="accept-invite" element={<AcceptInvitePage />} />
                    <Route index element={<Navigate to="/auth/login" replace />} />
                </Route>
            </Route>

            {/* Protected Dashboard Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={
                        <OverviewPage
                            products={dashboardData.products}
                            orders={dashboardData.orders}
                            staff={dashboardData.staff}
                            isLoading={dashboardData.isLoading}
                        />
                    } />

                    <Route path="/pos" element={
                        <POSPage
                            products={dashboardData.products}
                            customers={dashboardData.customers}
                            onSubmitOrder={dashboardData.handleCreateOrder}
                            createDraftOrder={dashboardData.createDraftOrder}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    <Route path="/inventory" element={
                        <InventoryPage
                            products={dashboardData.products}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    <Route path="/orders" element={
                        <OrdersPage
                            orders={dashboardData.orders}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    <Route path="/customers" element={
                        <CustomersPage
                            customers={dashboardData.customers}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    <Route path="/staff" element={
                        <StaffPage
                            staff={dashboardData.staff}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    {/* Role Protected Routes (Admin & Manager Only) */}
                    <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN']} />}>
                        <Route path="/integrations" element={<IntegrationsPage />} />
                        <Route path="/settings" element={
                            <div className="p-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in duration-500">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight mb-4">Core Systems Configuration</h3>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Sector Access: Restricted</p>
                                <div className="mt-8 p-12 border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center justify-center text-gray-300">
                                    <span className="font-black text-xs uppercase tracking-[0.3em]">Module Under Development</span>
                                </div>
                            </div>
                        } />
                    </Route>

                    <Route path="/analytics" element={<Navigate to="/dashboard" replace />} />
                </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
