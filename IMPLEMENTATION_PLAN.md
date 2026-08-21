# DeMegaPOS Technical Implementation Plan: SMTP Resolution, Tenant Store Dashboard (Phase 3), & Platform Control Tower (Phase 5)

## Executive Summary
This plan details the full implementation of:
1. **Permanent SMTP Resolution**: Refactoring Nodemailer transport logic to guarantee 100% email delivery for staff invitations using Gmail SMTP with App Passwords.
2. **Phase 3: Tenant Store Dashboard**: Building a rich, interactive operational and analytics dashboard for store owners (`/dashboard` & `/store-dashboard`) incorporating revenue KPIs, payment breakdowns, peak hour heatmaps, ABC inventory analysis, predictive reorder alerts, cashier metrics, and customer retention profiles.
3. **Phase 5: Platform Control Tower (`/control-tower`)**: Building a dedicated Super Admin Platform Control Tower with SaaS business metrics (MRR, ARR, GMV, Churn), engineering system health (API latency, 4xx/5xx logs, sync queues, storage quotas), administrative controls (Feature Flags, Maintenance Broadcasts, Audit Stream), and **Tenant Impersonation Mode ("View as Tenant")**.

---

## Blueprint Locations in Project
The architecture blueprints, system specifications, and design documents are persisted in the following project files:
1. **Root Implementation Plan**: [IMPLEMENTATION_PLAN.md](file:///c:/Users/Henry/Documents/DeMegaPOS/IMPLEMENTATION_PLAN.md)
2. **Root Task Tracking**: [TASKS.md](file:///c:/Users/Henry/Documents/DeMegaPOS/TASKS.md) & [task.md](file:///c:/Users/Henry/Documents/DeMegaPOS/task.md)
3. **Architecture Reference**: [DE-MEGA-ARCHITECTURE.md](file:///c:/Users/Henry/Documents/DeMegaPOS/DE-MEGA-ARCHITECTURE.md)
4. **Documentation Guide**: [OVERALL-DOCUMENTATION.md](file:///c:/Users/Henry/Documents/DeMegaPOS/OVERALL-DOCUMENTATION.md)
5. **System Artifacts**:
   - `C:\Users\Henry\.gemini\antigravity-ide\brain\b96fa5b5-9732-4769-961b-1e4ca29426e4\implementation_plan.md`
   - `C:\Users\Henry\.gemini\antigravity-ide\brain\b96fa5b5-9732-4769-961b-1e4ca29426e4\walkthrough.md`

---

## User Review Required

> [!IMPORTANT]
> **Dedicated Super Admin Route**: Phase 5 will be registered under the dedicated route `/control-tower` (with alias `/super-admin`), accessible exclusively to platform administrators (`SUPER_ADMIN` role or Super Admin Universal Access mode).

> [!NOTE]
> **Tenant Impersonation Security**: Clicking "View as Tenant" in the Super Admin Control Tower generates a scoped read-only session for that tenant, displays a top banner (`⚠️ TENANT IMPERSONATION MODE: {tenantName} (READ-ONLY)`), and allows administrators to safely inspect and diagnose tenant issues without mutating data.

---

## Proposed Changes

### Component 1: Permanent SMTP Email Dispatch Fix

#### [MODIFY] [mail.ts](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/backend/src/lib/mail.ts)
- Update `getGmailTransporter()` to use `service: 'gmail'` or explicit port `465` with `secure: true` for Gmail App Passwords (`demegakitchen5@gmail.com` / `oktzxxichuwuugyf`).
- Ensure fallback logic automatically tries Gmail if primary provider returns an error, preventing SMTP delivery warnings.
- Update default `MAIL_PROVIDER="GMAIL"` in `.env`.

---

### Component 2: Phase 3 - Tenant Store Analytics & Operational Dashboard Component

#### [NEW] [TenantStoreDashboardPage.tsx](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/web-back-office/src/pages/dashboard/TenantStoreDashboardPage.tsx)
- Build a dedicated, rich operational dashboard for store owners & branch managers.
- **Section 1: Revenue & Order KPIs**: Gross & Net Revenue, payment method breakdown charts (Cash, Card, Transfer, Store Credit, Split), AOV, completed transaction counts.
- **Section 2: Operational Heatmap**: 24-hour peak sales hour heatmap visualization.
- **Section 3: Inventory Analytics & ABC Analysis**:
  - Class A (80% revenue drivers), Class B (steady items), Class C (dead stock).
  - Shrinkage & stock discrepancy tracker.
  - Predictive reorder alerts and stockout forecasts based on 7-day sales velocity.
- **Section 4: Staff & Customer Insights**:
  - Cashier sales table, average checkout speed, register cash variances, void counts.
  - Customer retention ratio (walk-in vs repeat), top spenders table, loyalty point balances.

#### [MODIFY] [AppRoutes.tsx](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/web-back-office/src/routes/AppRoutes.tsx)
- Register route `/store-dashboard` and embed rich Tenant Store Dashboard into overview/analytics routes.

---

### Component 3: Phase 5 - Platform Control Tower & Impersonation Engine Component

#### [NEW] [PlatformControlTowerPage.tsx](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/web-back-office/src/pages/dashboard/PlatformControlTowerPage.tsx)
- Build a dedicated Super Admin Platform Control Tower page under route `/control-tower`.
- **Section 1: Executive SaaS Business Metrics**:
  - MRR & ARR growth, total active tenants, store branches, online POS terminals.
  - Platform Gross Merchandise Value (GMV) across all tenants.
  - Trial-to-paid conversion rates & tenant churn.
- **Section 2: Engineering & System Health**:
  - Real-time API latency (ms), health gauges, HTTP 4xx/5xx error log stream.
  - Offline sync queue monitor & background worker status.
  - Tenant database & file storage consumption metrics.

## Phase 16: Database Architecture Audit, Background Daemonization & Service Persistence

### 1. Architectural Audit Summary
- **Direct Database Routing**: Verified that all backend Fastify endpoints connect directly to the PostgreSQL engine via the official `@prisma/client` engine binary using `DATABASE_URL` (and `DIRECT_DATABASE_URL` for migrations/pooling bypass).
- **Prisma Studio Decoupling**: Confirmed that Prisma Studio (`pnpm studio` on port 5555) is strictly an auxiliary developer GUI client and is completely decoupled from backend API request handling. Backend requests execute directly against PostgreSQL without proxying through Studio.
- **Multi-Tenant Context Layer**: Multi-tenant isolation is handled cleanly at the application layer via `packages/db/index.ts` using Prisma Client Extensions (`$extends` query middleware) and `AsyncLocalStorage` (`requestContext`).

### 2. Planned Implementation
- **PM2 Ecosystem Configuration (`ecosystem.config.js`)**: Add process management configuration to run backend services, frontend portals, and Prisma Studio as headless background daemons with automatic restart on crash/reboot (`pm2 startup` & `pm2 save`).
- **Enhanced Docker Compose (`docker-compose.yml`)**: Add `restart: always`, persistent volume mounts (`postgres_data`), and healthcheck probes for offline local PostgreSQL & Redis instances.
- **Environment & Hosting Documentation (`.env.example` & Architecture guides)**: Detail production-grade connection strings and connection pooling guidelines for Supabase, Neon, Railway, and local containerized PostgreSQL.

## Phase 17: Production Frontend Deployment Strategy Evaluation & Multi-Platform Automation

### 1. Architectural Audit of Deployment Options
- **Option 1 (Vercel Monorepo Deployment)**: **SELECTED (Primary CI/CD)**.
  - Root Cause of Prior Failure: `vercel.json` specified `installCommand: "npm install --prefix ../web-back-office"` and `outputDirectory: "../web-back-office/dist"`, which referenced invalid relative paths outside the build root and bypassed pnpm workspace resolution.
  - Remedy: Configure root `vercel.json` with `buildCommand: "pnpm --filter web-back-office build"`, `outputDirectory: "apps/web-back-office/dist"`, and SPA rewrites. Also create `apps/web-back-office/vercel.json` with `outputDirectory: "dist"` for root-directory scoped deployments.
- **Option 2 (Netlify Account Re-link)**: Evaluated as a temporary workaround. Bypasses credit limits by linking a new team, but does not solve recurring credit consumption on frequent git pushes.
- **Option 3 (Local Zero-Credit CLI Deployment)**: **SELECTED (Complementary / Emergency Deploy)**.
  - Provides a 0-credit fallback mechanism. Compiles artifacts locally (`apps/web-back-office/dist`) and deploys directly via Netlify CLI / Vercel CLI without consuming server build minutes.

### 2. Execution Blueprint
1. Fix root `vercel.json` and add `apps/web-back-office/vercel.json`.
2. Optimize `netlify.toml` with clean base path and SPA redirect rules.
3. Add root convenience deploy scripts: `build:admin`, `deploy:netlify`, `deploy:vercel`.
4. Document production deployment steps and environment variable requirements (`VITE_API_URL`).

- **Section 3: Tenant Impersonation Engine ("View as Tenant")**:
  - Render tenant management list with single-click "View as Tenant" button.
  - Upon activation: store impersonation state, switch dashboard view to target tenant, display persistent warning banner (`⚠️ TENANT IMPERSONATION MODE: {tenantName} (READ-ONLY)`), and provide an "Exit Impersonation" action button.
- **Section 4: Global Controls & Feature Flags**:
  - Global Feature Flag toggles (Multi-currency, Kitchen Display System, Loyalty engine).
  - Platform System Maintenance Broadcast banner creator.
  - Global security audit stream.

#### [NEW / MODIFY] Backend Control Tower API Routes
- **File**: [routes.ts](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/backend/src/modules/tenants/routes.ts) or `apps/backend/src/modules/superadmin/routes.ts`
- `GET /superadmin/analytics`: Aggregated SaaS platform stats across all tenants.
- `GET /superadmin/tenants`: Platform tenant list with storage usage & active terminals count.
- `POST /superadmin/impersonate/:tenantId`: Generate read-only impersonation token.

#### [MODIFY] [AppRoutes.tsx](file:///c:/Users/Henry/Documents/DeMegaPOS/apps/web-back-office/src/routes/AppRoutes.tsx)
- Register dedicated unique routes `/control-tower` and `/super-admin` pointing to `<PlatformControlTowerPage />`.
- Add Impersonation Mode banner overlay in `AppLayout.tsx`.

### Component 4: Phase 9 - Multi-Branch Period Filter Alignment & Accessible Card Tooltips

#### [NEW] [Tooltip.tsx](file:///c:/Users/chiam/Downloads/DeMegaPOS%20(4)/DeMegaPOS/apps/web-back-office/src/components/Tooltip.tsx)
- Reusable accessible Tooltip component with sleek dark styling, hover/focus support, and arrow indicators.

#### [MODIFY] [MultiBranchComparison.tsx](file:///c:/Users/chiam/Downloads/DeMegaPOS%20(4)/DeMegaPOS/apps/web-back-office/src/pages/analytics/MultiBranchComparison.tsx)
- Match `/analytics` period filter UI: Presets (`Today`, `This Week`, `This Month`, `1 Year`, `3 Years`, `5 Years`) + `DateRangePicker` calendar dropdown.
- Pass dynamic `startDate` and `endDate` query params to `/orders/analytics`.
- Wrap all truncated card labels, numeric values, branch names, and table cells in `Tooltip`.

---

## Phase 20: Frontend Refresh Trigger Removal & Lightweight Render Keep-Alive Endpoint

### 1. Objectives & Executive Summary
- Eliminate all forced page reloads (`window.location.reload()`), aggressive interval polling (`setInterval`), and tab visibility/focus refresh triggers across the frontend (`apps/web-back-office`).
- Preserve seamless reactive UI state management: data updates flow strictly through API responses, component mount lifecycle, and WebSocket broadcast listeners.
- Add an ultra-lightweight, zero-DB `GET /health` (and `GET /api/v1/health`) endpoint in `apps/backend` returning `{ status: "ok", timestamp: number }` with sub-millisecond response time.
- Provide documentation for external keep-alive cron services (Cron-Job.org / UptimeRobot) to ping the Render backend every 10 minutes to prevent cold starts without needing local terminal daemons.

### 2. Architectural Blueprint & Changes

#### A. Frontend Refresh Mechanism Removals (`apps/web-back-office`)
- **[MODIFY] [`AppLayout.tsx`](file:///c:/Users/chiam/Downloads/DeMegaPOS%20(4)/DeMegaPOS/apps/web-back-office/src/layouts/AppLayout.tsx)**:
  - Remove `window.location.reload()` in the branch selector.
  - Dispatch custom event `'demega:branch-changed'` and update local state seamlessly without a full browser reload.
- **[MODIFY] [`useDashboardData.ts`](file:///c:/Users/chiam/Downloads/DeMegaPOS%20(4)/DeMegaPOS/apps/web-back-office/src/hooks/useDashboardData.ts)**:
  - Remove 10-second `setInterval` background polling.
  - Remove `visibilitychange` and `window.onfocus` event listeners that forced aggressive data re-fetches.
  - Listen for `'demega:branch-changed'` to fetch data on branch switch cleanly.
  - Retain action-driven updates (`handleCreateOrder` optimistic prepend) and WebSocket push notifications.

#### B. Backend Lightweight Health Check (`apps/backend`)
- **[MODIFY] [`index.ts`](file:///c:/Users/chiam/Downloads/DeMegaPOS%20(4)/DeMegaPOS/apps/backend/src/index.ts)**:
  - Add `server.get('/health', async () => ({ status: 'ok', timestamp: Date.now() }))`
  - Add `server.get('/api/v1/health', async () => ({ status: 'ok', timestamp: Date.now() }))`
  - Move full diagnostic/mail info to `GET /health/diagnostic` and `GET /health/mail`.
  - Exclude `/health` and `/api/v1/health` from JWT authentication hooks.

### 3. Verification Plan
- Build frontend (`npm run build` in `apps/web-back-office`) to verify clean compilation.
- Test that changing branches in the header does not reload the page (`window.location.reload()` is absent).
- Test that `/health` returns `{ status: "ok", timestamp: ... }` with HTTP 200 and zero database load.

