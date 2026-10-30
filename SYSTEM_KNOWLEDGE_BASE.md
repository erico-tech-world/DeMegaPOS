# DeMegaPOS System Knowledge Base

## 1. Executive Summary
DeMegaPOS is an enterprise-grade, multi-tenant Point of Sale (POS) and Business Management ecosystem. It is designed for high-concurrency retail/restaurant environments, supporting real-time synchronization across multiple terminals (Web POS, Kitchen Display, Customer Board) and providing a robust offline-first experience via a dedicated Mobile POS application.

## 2. System Architecture
The project is structured as a monorepo using **pnpm workspaces** and **Turbo**, comprising several specialized applications and a shared database package.

### 2.1 Component Topology
- **Backend (`apps/backend`)**: A Fastify-based REST API and WebSocket server. Acts as the single source of truth.
- **Mobile POS (`apps/mobile-pos`)**: A React Native (Expo) app using WatermelonDB for offline-first local storage and bi-directional delta synchronization.
- **Web Back-Office (`apps/web-back-office`)**: A Vite/React dashboard for management, inventory control, and reporting.
- **Web Kitchen (`apps/web-kitchen`)**: A real-time order management board for kitchen staff.
- **Web Customer (`apps/web-customer`)**: A public-facing status board for order pickup notifications.
- **Database Package (`packages/db`)**: A shared Prisma schema and client used by the backend.

### 2.2 Core Technology Stack
| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Language** | TypeScript | Type safety across the entire stack |
| **API Framework** | Fastify | High-performance backend routing |
| **Database** | PostgreSQL | Primary persistent storage |
| **ORM** | Prisma | Type-safe database access and migrations |
| **Local DB (Mobile)** | WatermelonDB / SQLite | Offline-first reactive storage |
| **Real-time** | WebSockets (`@fastify/websocket`) | Instant broadcast of orders and payments |
| **Frontend** | React / Vite / Tailwind CSS | Modern, responsive UI |
| **Mobile** | React Native / Expo | Cross-platform field terminal |
| **Payments** | Monnify | Integration for card and digital payments |

## 3. Data Flow & Domain Logic

### 3.1 Multi-Tenancy Model
The system implements a hierarchical multi-tenancy structure:
`Tenant (Business)` $\rightarrow$ `Store (Branch)` $\rightarrow$ `User (Staff)`.
- **Tenant**: Represents the overall business entity.
- **Store**: Represents individual physical locations.
- **User**: Staff members assigned to specific stores or granted omni-branch access.

### 3.2 The "Split-Track" Order Lifecycle
To prevent business logic corruption, fulfillment and financial states are managed on separate tracks:
- **Fulfillment Track (`status` / `fulfillmentStatus`)**: Managed by kitchen/warehouse staff (e.g., `NEW` $\rightarrow$ `IN_PREPARATION` $\rightarrow$ `READY_FOR_PICKUP` $\rightarrow$ `DELIVERED`).
- **Financial Track (`paymentStatus`)**: Managed by payment gateways or cashiers (e.g., `PENDING` $\rightarrow$ `SUCCESS` or `FAILED`).

### 3.3 Real-Time Synchronization Engine
The backend broadcasts events via WebSockets to ensure all terminals are in sync without page refreshes:
- `ORDER_CREATED`: Triggers new cards in the Kitchen app and stock decrements in POS.
- `ORDER_UPDATED`: Refreshes status on Back-Office and Kitchen boards.
- `PAYMENT_SUCCESS`: Signals the POS to print receipts and unlock drawers.

### 3.4 Offline-First Sync (Mobile POS)
The Mobile POS uses a delta-sync strategy to handle intermittent connectivity:
1. **Pull**: Client requests changes since `lastPulledAt`. Backend returns created/updated records for Products, Orders, and Customers.
2. **Push**: Client sends local changes to the backend. Backend applies these via `upsert` operations.
3. **Conflict Resolution**: Currently uses a "last-write-wins" approach based on timestamps.

## 4. Security & Authentication

### 4.1 Authentication Model
- **Dual-Identifier Login**: Users can authenticate using Email, Phone Number, or a unique `staffCode`.
- **RBAC (Role-Based Access Control)**: Roles include `SUPER_ADMIN`, `BRANCH_MANAGER`, `INVENTORY_MANAGER`, and `CASHIER`.
- **POS PIN**: Support for 4-6 digit hashed PINs for rapid terminal switching.
- **Session Management**: JWT-based authentication with a global `onRequest` guard in Fastify.

### 4.2 Integration Security
- **Payment Webhooks**: Monnify webhooks are used to update `paymentStatus` asynchronously.
- **Environment Hardening**: Use of `.env` for secrets, with a dedicated `TerminalIntegration` model for tenant-specific API keys.

## 5. Deployment & Infrastructure
- **Database**: Optimized for PgBouncer (Transaction Mode) to handle serverless/scaled environments (Supabase/Neon).
- **Build Pipeline**: Turbo manages the build graph; frontends are deployed via Vercel/Netlify.
- **Containerization**: Dockerfiles provided for backend and back-office apps.
