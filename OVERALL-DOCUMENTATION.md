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

---
*Last Updated: 2026-07-15*
