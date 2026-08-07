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

---

## Verification Plan

### Automated Compilation & Build Tests
- Backend build: `pnpm --filter demegapos-backend build`
- Frontend build: `pnpm --filter web-back-office build`

### Manual Verification
1. **SMTP Email Test**: Run invitation dispatch via Staff Page or `node test-invite.js` -> confirm email arrives in inbox with `emailSent: true`.
2. **Tenant Store Dashboard**: Navigate to `/store-dashboard` -> verify KPI cards, payment breakdown, peak hour heatmap, ABC inventory metrics, and cashier performance tables.
3. **Platform Control Tower**: Navigate to `/control-tower` -> verify SaaS MRR/ARR/GMV stats, API latency gauges, tenant storage quotas, and feature flags.
4. **Tenant Impersonation Mode**: Click "View as Tenant" on any tenant -> verify banner appears (`⚠️ TENANT IMPERSONATION MODE: {tenantName} (READ-ONLY)`), tenant data loads in read-only state, and clicking "Exit Impersonation" returns to Super Admin view.
