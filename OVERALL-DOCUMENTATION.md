# DeMega POS Overall Documentation

This document serves as the central repository for all architectural, UI, logic, and structural changes made during the DeMega POS Ecosystem Upgrade.

## 🏗️ Architecture Overview
DeMega POS is built as a multi-tenant, micro-service ready monolith (Fastify + Vite + Prisma).

### Core Components
- **Backend**: Fastify API with scoping middleware for multi-tenancy.
- **Frontend**: Vite-powered React SPA with Tailwind CSS.
- **Database**: PostgreSQL with Prisma ORM.

## 🔐 Authentication & Security
- **Dual-Identifier Auth**: Supports both Email and Phone Number for login and registration.
- **RBAC**: Strict Role-Based Access Control (SUPER_ADMIN, BRANCH_MANAGER, INVENTORY_MANAGER, CASHIER).
- **Session Management**: Secure token-based sessions with multi-tenant isolation.
- **Forgot Password**: Full flow for password recovery via Email or Phone.

## 🎨 Design System & UX
- **Theme**: Premium High-End SaaS aesthetic (Glassmorphism, Dark/Green palette).
- **Standardized Actions**: Consistent "Green CTA" standard for primary buttons.
- **UX Standards**: Global `cursor: pointer` enforcement for all interactive elements.

## 🛣️ Roadmap Refinement
- **Phase 15**: UI Consistency & Layout Correction (Completed).
- **Phase 16**: UX Refinement & Advanced Auth Logic (Completed).
    - [x] Dual-Identifier support (Email/Phone) for Registration and Login.
    - [x] Full Forgot Password recovery flow.
    - [x] Global `cursor: pointer` enforcement for better UX.
- **Phase 17**: Unified Monnify Integration & Real-Time Sync Engine (Completed).
    - [x] real-time WebSocket Sync Engine broadcasting order and payment updates.
    - [x] Monnify "Push-to-POS" payment flow and callback webhooks.
    - [x] Fulfillment (`status`) and Financial (`paymentStatus`) tracks split.
    - [x] Front-end build resolution and Vercel build configuration (`vercel.json`).
    - [x] Prisma Client & CLI version alignment (`^6.2.1`) to resolve generator crashes.
- **Phase 18**: Mobile POS & Offline-First WatermelonDB Sync (Completed).
    - [x] React Native / Expo Mobile POS with offline-first local database (WatermelonDB).
    - [x] SQLite native storage adapter on mobile / LokiJS in-memory adapter on Web.
    - [x] Bi-directional delta sync engine (`/sync/pull` and `/sync/push`) with timestamp resolution.
    - [x] Draft order lifecycle, VIP price overrides, customer wallet integration, and multi-tender checkout (`CASH`, `CARD`, `TRANSFER`, `SPLIT`, `CREDIT`).
    - [x] Reactive UI observables via `@nozbe/with-observables` with instant live search and barcode ready data modeling.

---
*Last Updated: 2026-08-14*

# 1. Build the frontend locally (takes ~5 seconds)
pnpm run build:admin

# 2. Deploy directly to your live Netlify production site (0 build credits used)
npx netlify-cli deploy --prod --dir=apps/web-back-office/dist
    

# remeber to check and implement these when these features are added
# orderType, fulfillmentStatus, and discountApplied are not in schema.prisma. The filter controls for these will be rendered but will filter client-side (no backend param) until a schema migration adds them. This keeps the plan non-breaking.