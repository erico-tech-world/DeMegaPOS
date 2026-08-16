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
import AnalyticsPage from '../pages/dashboard/AnalyticsPage';
import SettingsPage from '../pages/SettingsPage';
import PlatformLoginPage from '../pages/platform/PlatformLoginPage';
import PlatformDashboard from '../pages/platform/PlatformDashboard';
import { useDashboardData } from '../hooks/useDashboardData';
import { IntegrationsPage } from '../pages/IntegrationsPage';
import MultiBranchComparison from '../pages/analytics/MultiBranchComparison';

const AppRoutes = () => {
    const dashboardData = useDashboardData();

    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />

            {/* Platform Control Tower — completely isolated, no tenant AppLayout */}
            <Route path="/platform/login" element={<PlatformLoginPage />} />
            <Route path="/platform/dashboard" element={<PlatformDashboard />} />
            {/* Dedicated Control Tower route aliases */}
            <Route path="/control-tower" element={<Navigate to="/platform/login" replace />} />
            <Route path="/super-admin" element={<Navigate to="/platform/login" replace />} />

            {/* Auth Routes (Public Only — redirects authenticated users to /dashboard) */}
            <Route element={<PublicOnlyRoute />}>
                <Route path="/auth" element={<AuthLayout />}>
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route index element={<Navigate to="/auth/login" replace />} />
                </Route>
            </Route>

            {/*
              * Invitation Activation Route — BYPASSES PublicOnlyRoute intentionally.
              * An authenticated user clicking a staff invitation link must reach this
              * page, not be silently redirected to /dashboard. The AcceptInvitePage
              * handles the session conflict internally via a modal.
              */}
            <Route path="/auth" element={<AuthLayout />}>
                <Route path="accept-invite" element={<AcceptInvitePage />} />
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
                            resetFinancials={dashboardData.resetFinancials}
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
                            draftOrders={dashboardData.draftOrders}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                            fetchDraftOrders={dashboardData.fetchDraftOrders}
                            lockDraftOrder={dashboardData.lockDraftOrder}
                            cancelDraftOrder={dashboardData.cancelDraftOrder}
                        />
                    } />

                    <Route path="/customers" element={
                        <CustomersPage
                            customers={dashboardData.customers}
                            isLoading={dashboardData.isLoading}
                            refresh={dashboardData.refresh}
                        />
                    } />

                    {/* Role Protected Routes (Admin & Manager Only) */}
                    <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'OWNER', 'ADMIN']} />}>
                        <Route path="/analytics" element={<AnalyticsPage />} />
                        <Route path="/staff" element={
                            <StaffPage
                                staff={dashboardData.staff}
                                isLoading={dashboardData.isLoading}
                                refresh={dashboardData.refresh}
                            />
                        } />
                        <Route path="/integrations" element={<IntegrationsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                    </Route>

                    {/* Super Admin / Owner Only Routes */}
                    <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'OWNER']} />}>
                        <Route path="/analytics/multi-branch" element={<MultiBranchComparison />} />
                        <Route path="/multi-branch" element={<MultiBranchComparison />} />
                    </Route>
                </Route>
            </Route>


            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
