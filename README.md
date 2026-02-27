# DeMegaPOS Platform

Enterprise-grade POS, Inventory, and Business Platform.

## 🚀 Quick Start Guide

To get the platform running, follow these steps in order.

### 1. Prerequisites
- **Node.js**: v20 or v22
- **pnpm**: v9 or v10
- **Docker Desktop**: (Optional but recommended for DB/Redis)

### 2. Infrastructure Setup (Databases)
If you have **Docker Desktop** installed and running:
```powershell
docker-compose up -d
```
*This starts PostgreSQL and Redis.*

### 3. Database Initialization
Once the database is running:
```powershell
cd packages/db
pnpm run db:push
pnpm run db:seed
```
*This creates the schema and populates initial admin data (Login: admin@demega.com / password123).*

### 4. Start the Backend API
```powershell
cd apps/backend
pnpm dev
```
*API runs at http://localhost:3000*

### 5. Start the Web Dashboards
Each dashboard runs as a separate Vite app:
- **Back-Office**: `cd apps/web-back-office && pnpm dev` (http://localhost:5173)
- **Kitchen**: `cd apps/web-kitchen && pnpm dev` (http://localhost:5174)
- **Customer**: `cd apps/web-customer && pnpm dev` (http://localhost:5175)

### 6. Start the Mobile POS
```powershell
cd apps/mobile-pos
pnpm start
```
*Use the Expo Go app on your phone to scan the QR code.*

---

## 🛠 Project Structure
- `apps/backend`: Fastify API
- `apps/mobile-pos`: React Native (Expo) + WatermelonDB
- `apps/web-back-office`: Admin Dashboard
- `apps/web-kitchen`: Kitchen Display System
- `apps/web-customer`: Customer tracking board
- `packages/db`: Shared Prisma Schema & Client

## 📝 Testing Credentials
- **Admin Email**: `admin@demega.com`
- **Password**: `password123`
- **Tenant Slug**: `mega-retail`


DeMegaPOS Environment Restart Guide
If your Docker Desktop crashes or you need to restart the development environment, follow these steps to get everything running again smoothly.

1. Restart Docker & Database
First, ensure your database services are running.

Open Docker Desktop and wait for it to initialize.
In your terminal (root directory):
powershell
```
docker-compose up -d
```

This starts PostgreSQL and Redis in the background.

2. Seed Database (Optional)
If you reset your database or need to ensure initial data exists:

powershell
# From root directory
```
cd packages/db
pnpm run db:seed
```
Note: The seed script is now idempotent, so it's safe to run multiple times.

3. Start Backend & Web Apps
Open a terminal in the root directory:

powershell
```pnpm dev
```
This starts the Backend, Back-office, Kitchen, and Customer apps concurrently.

4. Start Mobile POS
Open a separate terminal for the mobile app:

powershell
```
cd apps/mobile-pos
pnpm start

Press w in the terminal to open the web version in your browser (http://localhost:8081).

Troubleshooting
"Unique constraint failed" during seeding:
Don't worry! The updated script handles duplicates automatically. You can ignore "already exists" messages.
"Metro Bundler failed" or Cache Issues:

If the mobile app fails to start, run this command in apps/mobile-pos:
powershell
# Clear cache and restart
```
if (Test-Path ".expo") { Remove-Item -Recurse -Force ".expo" }
pnpm start --reset-cache
```
Port Conflicts:
Web apps run on: 3000 (Back-office), 3001 (Kitchen), 3002 (Customer)
Backend runs on: 3003
Mobile Bundler: 8081