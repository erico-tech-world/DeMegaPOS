# DeMegaPOS Task Tracking - Enterprise Rollout & Upgrades

## Phase 0: Receipt Update
- `[x]` Update receipt header in `apps/web-back-office/src/components/POSView.tsx` from "DEMEGA SUPERMARKET" to "DEMEGA POS"
- `[x]` Verify receipt header updates dynamically from tenant settings (with fallback to "DEMEGA POS")
- `[x]` Audit project web app to ensure receipt header fallback defaults to "DEMEGA POS" everywhere

## Phase 1: Core Data & Security Logic (Step 1)
- `[x]` Create `GET /tenants/branches` backend endpoint filtering strictly by authenticated user's `tenantId`
- `[x]` Update `POST /staff/invite` and `PUT /staff/:id` backend endpoints to handle nullable `branchId` for Omni-Access vs specific branch assignment
- `[x]` Enforce backend RBAC query middleware: restrict branch staff to their assigned `branchId` (`storeId`) while granting Omni-Access (`branchId: null`) cross-sector access under `tenantId`
- `[x]` Refactor `InviteStaffModal` and `EditStaffModal` in `apps/web-back-office/src/components/PeopleComponents.tsx`: convert "Assigned Sector" into styled `<select>` dropdown populated dynamically with active tenant branches and top default option `"Omni-Access (All Sectors / Branches)"` (`value=""`)

## Phase 2: Local Infrastructure Engine (Step 2)
- `[x]` Perform codebase audit for offline persistence (Confirmed: IndexedDB/offline engine was not present in web-back-office)
- `[x]` Create local-first IndexedDB storage manager (`offlineStorage.ts`) for offline sales, cart, draft orders, and receipts
- `[x]` Implement background sync & conflict resolution engine (`syncEngine.ts`) with online/offline network listeners and "OFFLINE MODE (LOCAL DRIVE ACTIVE)" UI indicator
- `[x]` Build Admin Storage Utilities: Local Storage Health Monitor (MB/GB used vs available quota), Manual Sync Trigger, Database Backup (.json export) & Restore (.json import)

## SMTP Email Dispatch Resolution
- `[ ]` Refactor Nodemailer transporter in `apps/backend/src/lib/mail.ts` using `service: 'gmail'` / port `465` SSL with App Passwords to guarantee 100% email delivery
- `[ ]` Update `apps/backend/.env` with `MAIL_PROVIDER="GMAIL"` as default primary provider
- `[ ]` Verify staff invitation email dispatch returns `emailSent: true` and delivers invitation link to recipient inbox

## Phase 3: Tenant Store Dashboard Feature Implementation (Step 3)
- `[ ]` Create `apps/web-back-office/src/pages/dashboard/TenantStoreDashboardPage.tsx`
- `[ ]` Implement Real-time Gross & Net Revenue tracking, payment method breakdown (Cash, Card, Transfer, Store Credit, Split), AOV, completed order count
- `[ ]` Implement 24-hour peak sales hour heatmap visualization
- `[ ]` Implement ABC Inventory Analysis (Category A drivers, Category B steady, Category C dead stock), shrinkage logs, and predictive stockout alerts
- `[ ]` Implement Staff & Customer Insights: cashier checkout speeds, register variances, void counts, walk-in vs repeat ratio, top customer spenders, and loyalty points
- `[ ]` Register `/store-dashboard` route in `AppRoutes.tsx`

## Phase 4: Store Settings & Configuration (Step 4)
- `[x]` Replace placeholder "MODULE UNDER DEVELOPMENT" on `/settings` with new tabbed Enterprise Settings Module (`src/pages/SettingsPage.tsx`)
- `[x]` Implement 6 Tabs: General Business Profile, Tax & Payment Gateways, Receipt Designer, Hardware Settings, Security & POS Rules, Offline & Storage Engine
- `[x]` Connect settings state to backend API endpoints (`GET /tenants/settings`, `PUT /tenants/settings`) with sticky bottom floating "Save Changes" bar & optimistic toast notifications

## Phase 5: Platform Control Tower & Security Layer
- `[x]` Platform Control Tower pages (`/platform/login`, `/platform/dashboard`) implemented with SaaS KPIs and tenant directory
- `[x]` Platform Secret Key Engine: Dynamic random key generation + fixed reusable key management via backend & database
- `[x]` Enhanced Platform Control Tower UX: Secret key inspector, recovery guidance, and key generation management controls

## Phase 6: Global User-Scoped Theme Engine (Light / Dark Mode)
- `[x]` Update database schema (`User.themePreference`) and Prisma client
- `[x]` Implement `PATCH /auth/theme` backend API endpoint
- `[x]` Build `ThemeContext` and `useTheme()` hook with localStorage fallback and per-user isolation
- `[x]` Add Sun/Moon theme switcher toggle to Top Header Navbar (`AppLayout.tsx`) and Settings page
- `[x]` Configure `@custom-variant dark` in `index.css` for Tailwind v4 class mode support across all dashboard pages

## Phase 7: Order History, Refund Database Table & Friendly Error Toasts
- `[x]` Add `Refund` model to `packages/db/prisma/schema.prisma` and update `Order` relation to fix `public.Refund does not exist` error
- `[x]` Pushed schema changes to database via `prisma db push` — Refund, StaffInvitation, branchCode, businessCode, staffCode tables/columns live
- `[ ]` Modernize Error UI: Replace raw stack trace dumps with friendly UI Toast Notifications across backend error handlers and frontend views
- `[ ]` Add `POST /orders/:id/refund` database logging into `prisma.refund.create()` with stock inventory reversal

## Phase 8: Dashboard (Overview) & POS Terminal Post-Checkout Features
- `[x]` Dashboard Overview: Add "Monthly Sales" stat card for Branch Managers & Owners (CalendarRange icon)
- `[x]` Dashboard Overview: Add Quick Actions shortcut bar (POS, Inventory, Orders, Customers, Analytics, Settings) below stat cards with hover micro-animations
- `[ ]` POS Terminal: Add Post-Checkout Digital Receipt Options Modal ("Send Digital Receipt to Customer?")
- `[ ]` POS Terminal: Dynamic customer email input for Walk-ins / missing emails with on-the-fly CRM profile update (`customers` table)
- `[ ]` Settings: Add `Prompt to Email Digital Receipt at Checkout` toggle switch under Receipt & Printers tab

## Phase 9: Staff Directory Overhaul & Auth Hardening
- `[x]` Staff schema extensions: `staffCode`, `pin`, `status`, `isActive`, `onboardedAt`, `terminatedAt`, `terminationReason`, `branchCode`, `businessCode`
- `[x]` StaffPage dual-tab: Active Staff / Terminated & Suspended archive view with status badges
- `[x]` ManageAccessModal: Suspend/Terminate staff with offboarding note, calling `PATCH /staff/:id/status`
- `[x]` OmniBranchAccessBadge: Replaces experimental Universal Access widgets — displays "Under Construction (Enterprise Cross-Tenant SSO Coming Soon)"
- `[x]` `PATCH /staff/:id/status` endpoint: Sets `status`, `isActive=false`, `terminationReason`, `terminatedAt`
- `[x]` Auth login 403 guard: Terminated/suspended accounts rejected at login with "Access Revoked" message
- `[x]` Global axios 403 interceptor in `apiConfig.ts` — instantly clears session and redirects to `/auth/login?revoked=1`
- `[x]` AcceptInvitePage updated with POS Terminal PIN field (4–6 digits, optional but recommended for cashiers)
- `[x]` `acceptInvitation` service generates unique `staffCode` (EMP-YYYY-NNN), hashes PIN, sets `status=ACTIVE`, `isActive=true`, `onboardedAt`
- `[x]` Dynamic APP_BASE_URL in staff invitation emails (replaces hardcoded localhost)
- `[x]` LoginPage dual-tab auth: Tab 1 = Business Owner Sign-In (email+password → dashboard), Tab 2 = Staff Terminal Sign-In (email/staffCode + PIN → POS)
- `[x]` Network status indicator in AppLayout header: "System Online" (green pulse) vs "OFFLINE MODE (LOCAL HARDWARE ACTIVE)" (amber, WifiOff icon)
## Phase 10: UI Dark Theme Standard, Digital Receipt Dispatch & Draft Cancel Fix
- `[x]` Dark Theme UI Polish: Standardize card backgrounds across OverviewPage ("Recent Activity"), OrdersHistory, Settings, and Modals with dark card tokens (`dark:bg-slate-900`, `dark:border-gray-800`, `dark:text-white`)
- `[x]` Digital Receipt Email Dispatch: Implement real-time `POST /orders/:id/email-receipt` backend route executing `sendMail()` via Gmail/Resend with verified success response
- `[x]` Draft Order Cancel & Delete Fix: Implement `cancelDraftOrder` in backend service performing cascade removal of `Order`, `OrderItem`, and `SplitPayment` records cleanly

## Phase 11: Category Management Engine, Financial Refund Analytics & Branch Code Auth
- `[x]` Categories & Tags Management: Dedicated UI tab with standalone `[ + Create New Category ]` button, category table, metadata editing, and slug generator
- `[x]` Category Item Transfer Engine: Modal re-mapping single or bulk items Category A -> Category B via `PATCH /categories/transfer`
- `[x]` In-Context Category Sub-Modal: Add `[ + Add Category ]` adjacent to Category dropdowns in Product modals with auto-select capability
- `[x]` Category Deletion Protection: `DELETE /categories/:id` validates mapped products and requires target fallback category re-assignment
- `[x]` Net Sales & Refund Calculations: Deduct refunds (`Net Sales = Gross Sales - Refunds`) on Dashboard overview KPI cards (`Today's Sales`, `Monthly Sales`, `Total Sales`)
- `[x]` Refund Analytics Module (`/analytics`): Total Refunded Amount (₦), Refund Volume Count, Refund Rate %, and Return Reasons Breakdown Chart
- `[x]` Dynamic Branch Creation & Auto Codes: Provision branches with immutable public `branchCode` (e.g. `BR-001`) and read-only Branch ID in `/settings`
- `[x]` Strict Role-Based Omni-Access: Restrict Top-Bar Branch Switcher strictly to `SUPER_ADMIN` and `TENANT_OWNER` roles; hide cross-branch switcher for managers/cashiers

## Phase 12: Settings Persistence, Dark Mode Parity, Branch Isolation & Refund Engine
- `[x]` Settings Persistence & State Hydration: Implement `GET /tenants/settings` and `PATCH /tenants/settings` backend API routes backed by `Tenant.settings` JSON in DB
- `[x]` Settings Page Hydration: Connect `/settings` to backend API so profile, receipt, refund policy, and email prompt settings re-hydrate from DB on refresh
- `[x]` Dark Mode Token Parity: Replace stark-white backgrounds (`bg-white`/`bg-gray-50`) in Staff, Customers, Inventory, POS grid/cart with dark tokens (`dark:bg-slate-900`, `dark:bg-slate-800`)
- `[x]` Modal Contrast Fixes: Apply `dark:text-white`, `dark:bg-slate-800`/`dark:bg-slate-900`, and `dark:placeholder-slate-400` across all 7 edit/add/invite modals
- `[x]` Branch Isolation & Zero-Replication: Enforce strict `storeId` database query filtering across `/orders`, `/analytics`, `/inventory`, `/staff`
- `[x]` Net Sales Refund Deductions: Deduct refunded amounts from `Today's Sales`, `Monthly Sales`, and `Total Sales` on Overview cards, and fix refund query in `getAnalyticsData`

## Phase 13: Branch CRUD Engine, Public Code Masking & Strict Multi-Branch Isolation
- `[x]` Database Schema Extension: Added `phone`, `status`, and `branchSettings` to `Store` model in Prisma schema
- `[x]` Branch CRUD API Engine: Implemented `GET /tenants/branches` (with auto-backfill), `POST /tenants/branches`, `PUT /tenants/branches/:id` (with immutable `branchCode`), and `DELETE /tenants/branches/:id` (soft-delete engine)
- `[x]` Soft-Delete Safety Engine: Prevent deactivating branch if active personnel are assigned, returning 409 Conflict with re-assignment prompt
- `[x]` Identifier Masking: Removed raw DB primary keys (`id`) from public UI; display ONLY human-readable `branch_code` (e.g. `BR-LAG-01`)
- `[x]` Edit Branch Modal: Built Super Admin Edit Branch configuration modal for Name, Location, Phone, Receipt Header/Footer with immutable code badge
- `[x]` Independent Branch Data Isolation: Enforced strict `WHERE tenant_id = :tenantId AND branch_id = :activeBranchId` database scoping across `/orders`, `/analytics`, `/inventory`, and `/dashboard`

## Phase 14: Multi-Branch Period Filter Alignment & Accessible Card Tooltips
- `[x]` Create reusable accessible Tooltip component (`apps/web-back-office/src/components/Tooltip.tsx`)
- `[x]` Align `/multi-branch` analysis period filter UI with `/analytics` (Presets: `Today`, `This Week`, `This Month`, `1 Year`, `3 Years`, `5 Years` + `DateRangePicker` calendar dropdown)
- `[x]` Connect dynamic date range filter to multi-branch aggregation API (`/orders/analytics?startDate=...&endDate=...`)
- `[x]` Wrap all truncated card titles, numerical values, branch names, and table cells in `Tooltip`
- `[x]` Verify 0 TypeScript errors and push to git remotes

## Phase 15: Dark Mode Text Visibility & Contrast Audit
- `[ ]` **POSView** – Fix "Assign Customer" label contrast (currently invisible `text-blue-900/40` in dark mode → `dark:text-slate-300`)
- `[ ]` **AddItemModal** – Add `dark:bg-slate-900` to modal container; add `dark:bg-slate-800 dark:border-gray-700 dark:text-white dark:placeholder-slate-400` to all input/select/textarea fields
- `[ ]` **EditItemModal** – Same dark mode input/container fixes as AddItemModal
- `[ ]` **StockAdjustmentModal** – Same dark mode input/container fixes
- `[ ]` **Inventory Table** – Add `dark:text-white` to item name cells and `dark:text-slate-200` to stock count cells; add dark variants to Advanced Filters Panel background and selects
- `[ ]` Verify 0 TypeScript errors and push to git remotes




