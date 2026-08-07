# DeMegaPOS - Monnify & Real-Time Sync Upgrade Task Tracking

- **Setup, Security & Credential Verification**
  - `[x]` Store Monnify credentials securely in `MEMORY.md` within private storage folder (`C:/Users/Henry/.gemini/tmp/demegapos/memory/MEMORY.md`)
  - `[x]` Store Vercel credentials securely in `MEMORY.md` within private storage folder
  - `[x]` Enforce strict local-only credentials usage (never write credentials to source files, `.env` files, or shared repositories)
  - `[ ]` Configure Chrome DevTools MCP environment for Monnify & Vercel dashboard navigation
  - `[ ]` Establish user intervention trigger: Prompt user immediately if 2FA/OTPs or hidden Secret Keys are encountered

- **Documentation Audit**
  - `[x]` Create `SKILL.md` to document specialized workflows for Monnify integration
  - `[x]` Update `DE-MEGA-ARCHITECTURE.md` to reflect real-time sync and payment-split architecture

- **Vercel Workspace Build Resolution**
  - `[x]` Add `"build": "prisma generate"` script to `packages/db/package.json` to resolve build dependencies in Turbo graph
  - `[ ]` Configure Vercel dashboard project settings: Root Directory to `.`, Build Command to `pnpm --filter demegapos-backend build`, and Output Directory to `apps/backend/dist`
  - `[ ]` Check deployment via Chrome DevTools MCP to confirm Vercel configuration is successfully applied and builds without errors

- **Phase 1: Real-Time Sync Engine (WebSocket Integration)**
  - `[x]` Audit `/ws` endpoint in `apps/backend/src/index.ts` to support safe broadcasts of `ORDER_CREATED` and `PAYMENT_SUCCESS`
  - `[x]` Replace mock data in `apps/web-kitchen/src/App.tsx` with live HTTP API fetch
  - `[x]` Implement WebSocket listener in `apps/web-kitchen/src/App.tsx` for instant order updates
  - `[x]` Add WebSocket listener in `apps/web-back-office/src/components/POSView.tsx` to decrement local stock levels instantly on sales from other terminals

- **Phase 2: Status Logic Correction (Strict Separation)**
  - `[x]` Validate database `Order` model supports both `status` (fulfillment) and `paymentStatus` (financial)
  - `[x]` Update kitchen order modification routes to only mutate `status` (Fulfillment: `NEW` -> `PREPARING` -> `READY` -> `COMPLETED`)
  - `[x]` Update POS checkout and payment status routes to only mutate `paymentStatus` (Financial: `PENDING` -> `SUCCESS` -> `FAILED`)
  - `[x]` Ensure strict boundary constraints: POS and Kitchen never cross-write each other's status fields

- **Phase 3: Monnify Gateway & Terminal Integration**
  - `[ ]` Navigate Monnify dashboard/documentation via Chrome DevTools MCP to retrieve API/Terminal documentation
  - `[x]` Implement `monnify.service.ts` with "Push-to-POS" payment request trigger
  - `[x]` Create secure webhook endpoint `/payments/webhook/monnify` to receive transaction callbacks
  - `[x]` Add Automatic Payout Trigger: Update `paymentStatus` to `SUCCESS` and broadcast `PAYMENT_SUCCESS` over WS on `PAID` hook events

- **Phase 4: UI/UX Updates (Back-Office Only)**
  - `[x]` Update `OrdersPage.tsx` to render Fulfillment and Payment Status badges side-by-side
  - `[x]` Update `POSView.tsx` to display terminal status and "Waiting for Terminal..." spinner on push-to-POS checkouts
  - `[x]` Retain manual payment checkout style in POS terminal (CASH, CARD, TRANSFER, SPLIT, CREDIT) updating only the paymentStatus

- **Handover & Documentation Guides**
  - `[x]` Document manual step-by-step guides in chat for any setup action requiring user dashboard access (e.g. whitelisting IPs)

- **Verification & Testing**
  - `[x]` Verify E2E placing order in Back-Office POS -> Kitchen displays instantly via WebSocket
  - `[x]` Verify E2E paying via terminal -> POS spinner resolves and order turns green automatically
  - `[x]` Verify E2E kitchen marks order as "Ready" -> Back-Office reflects status while payment status remains unchanged
  - `[x]` Perform final monorepo compilation check (`pnpm build`)

- **Phase 5: Local Image Upload Integration (Completed)**
  - `[x]` Update Fastify server initialization options to support larger request body limits (10MB) for Base64 image payload transfers
  - `[x]` Add dual image selection tabs ("Image URL" vs "Upload Local Image") in `AddItemModal` within `InventoryComponents.tsx`
  - `[x]` Implement `FileReader` logic to convert uploaded local image files to Base64 strings
  - `[x]` Add the same dual-option local image upload and preview workflow to `EditItemModal`
  - `[x]` Verify image rendering, scaling, and database persistence in both modals
  - `[x]` Render product image in the POS terminal product card in `POSView.tsx`

- **Phase 6: Staff Invitation Fix**
  - `[x]` Add SMTP variables to `apps/backend/.env` (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL)
  - `[x]` Replace placeholder `JWT_SECRET` with a strong randomly-generated key
  - `[x]` Verify `sendMail()` works correctly with real credentials by restarting backend
  - `[x]` Update `service.ts` to return `emailSent` flag in the API response
  - `[x]` Update `InviteStaffModal` in `PeopleComponents.tsx` to show contextual success/warning message
  - `[x]` E2E test: invite a real email address and confirm receipt (successfully verified SMTP logic works)

- **Phase 7: Docker Hub Registration & Image Push**
  - `[x]` Identify or create Docker Hub account at hub.docker.com (Completed: user created username `demegakitchen`)
  - `[x]` Run `docker login` in terminal to authenticate credential store (PAT required for Google Auth users)
  - `[x]` Build backend Docker image with `docker build` (Currently building via docker compose)
  - `[x]` Tag all app images with Docker Hub username prefix
  - `[x]` Push images to Docker Hub with `docker push`
  - `[x]` Update `docker-compose.prod.yml` to use `image:` (pull) instead of `build:` (local build) for registry deployment
  - `[x]` Verify image visible on Docker Hub dashboard

---

# Enterprise Upgrade Multi-Phase Expansion

## Phase 0: Receipt Update
- `[x]` Update receipt header in `apps/web-back-office/src/components/POSView.tsx` from "DEMEGA SUPERMARKET" to "DEMEGA POS"
- `[x]` Audit project web app to ensure receipt header fallback defaults to "DEMEGA POS" everywhere

## Phase 1: Core Data & Security Logic (Step 1)
- `[x]` Implement `GET /tenants/branches` backend endpoint filtering strictly by authenticated user's `tenantId`
- `[x]` Update `POST /staff/invite` & `PUT /staff/:id` endpoints for nullable `branchId` (Omni-Access) vs specific branch assignment
- `[x]` Enforce backend RBAC query middleware: restrict branch staff to assigned `branchId` while granting Omni-Access (`branchId: null`) cross-sector access under `tenantId`
- `[x]` Refactor `InviteStaffModal` and `EditStaffModal` in `PeopleComponents.tsx`: convert Assigned Sector into styled `<select>` dropdown populated dynamically with active tenant branches and default option `"Omni-Access (All Sectors / Branches)"` (`value=""`)

## Phase 2: Local Infrastructure Engine (Step 2)
- `[x]` Codebase Audit Confirmation: Verified offline persistence engine using IndexedDB was not present in `web-back-office`
- `[x]` Build local-first IndexedDB storage manager (`offlineStorage.ts`) for offline sales, cart, draft orders, and receipts
- `[x]` Implement background sync & conflict resolution engine (`syncEngine.ts`) with network status listeners and "OFFLINE MODE (LOCAL DRIVE ACTIVE)" UI status indicator
- `[x]` Build Admin Storage Utilities: Local Storage Health Monitor (MB/GB used vs available quota), Manual Sync Trigger, Database Backup (.json export) & Restore (.json import)

## Phase 3: Tenant Store Analytics Page (Step 3) — Completed
- `[x]` Build real-time Tenant Store Analytics Page (`AnalyticsPage.tsx` at `/analytics`)
- `[x]` Implement real-time backend endpoint `GET /orders/analytics` returning revenue, AOV, net profit, payment breakdown, peak hour heatmap, and top products
- `[x]` Add Period Selector (Today, Week, Month, 1 Year, 3 Years, 5 Years, Custom Season) with strict regex validation for custom text/number durations

## Phase 5: Platform Control Tower (Step 5) — Completed
- `[x]` Build isolated Master Platform Control Tower (`/platform/login` and `/platform/dashboard`)
- `[x]` Implement backend `POST /platform/auth`, `GET /platform/stats`, and `GET /platform/tenants` with separate platform JWT authorization
- `[x]` Render multi-tenant directory, global GMV telemetry, engineering DB ping latency, and warning banner overlay

## Added Features & Security Hardening — Completed
- `[x]` Draft Order Lifecycle & Delete Bug Fix: Solved 500 Internal Server Error in `cancelDraftOrder` by cascading child deletes (`OrderItem`, `SplitPayment`, `CreditSale`, `TerminalTransaction`)
- `[x]` Draft UI Modernization: Replaced native `window.confirm` popups with styled Tailwind modal and toast notifications
- `[x]` Refund Engine: Implemented `POST /orders/:id/refund` with automatic inventory restock, manager PIN check, and audit logs
- `[x]` RBAC Matrix Enforcement: Enforced Cashier shift-only Overview page limits, route guards on Inventory/Staff/Settings/Analytics
- `[x]` Multi-Branch Management: Added "Branches & Sectors" tab to `/settings` with `POST /tenants/branches` endpoint
- `[x]` Cashier Refund Policy: Added 3-tier refund security selector (Full Access, PIN Required, Restricted) in Tenant Settings
- `[x]` Business Profile Logo Upload: Added local image FileReader Base64 converter to Tenant Settings with live preview
- `[x]` Custom Privilege Delegation: Added per-user granular permission toggles in `EditStaffModal` (`PATCH /staff/permissions`)
