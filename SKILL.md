# Monnify Integration Developer Workflows & Guide

This document outlines the developer workflows, simulation endpoints, security constraints, and backend architecture details for integrating the Monnify payment gateway and POS terminal "Push-to-POS" flow into the DeMegaPOS system.

---

## 🏗️ Architecture Overview

The payment engine splits transactions into manual checkouts and terminal-push requests.
- **Card / Transfer via Terminal**: Triggers a card terminal request via `monnify.service.ts`, which displays a spinner on the POS and listens to WebSocket events for validation.
- **Webhook Updates**: Monnify notifies the backend via POST requests to `/payments/webhook/monnify` when a transaction succeeds.
- **WebSocket Broadcasts**: Once the webhook updates the database, the backend broadcasts `PAYMENT_SUCCESS` to the frontend, resolving the spinner.

---

## 🔒 Security & Credential Rules

1. **Isolation**: Never store Secret Keys, client secrets, or administrative portal credentials in the source code or `.env` files. Keep production secrets strictly in secure cloud environment variables.
2. **Local Memory Storage**: For debugging and configuration, administrative portal credentials must reside solely in:
   - `C:/Users/Henry/.gemini/tmp/demegapos/memory/MEMORY.md` (Private folder)
3. **Local Dev Environment Protection**: Never commit sandbox or production credentials to shared git repositories.
4. **2FA / Secret Keys Rule**: If interacting via Chrome DevTools MCP, any display of 2FA/OTP inputs or unmasked production Secret Keys requires **immediate halt** and manual user intervention.

---

## 🛠️ Specialized Workflows

### A. Simulating a POS Terminal Push-Payment
Since physical card terminals cannot always be attached to local developer environments, we use a simulation route.

1. **Trigger Request**: Cashier clicks **Monnify Terminal** checkout on POS.
2. **Backend Service**: Calls `initiateTerminalPayment(orderId, amount)` inside `apps/backend/src/modules/payments/monnify.service.ts`.
3. **Simulation Mode**: If `NODE_ENV === 'development'`, the service prints a JSON webhook mock payload to the console and simulates a terminal standby.
4. **Webhook Callback**: Use `curl` or Postman to post the mock payload to:
   ```bash
   POST http://localhost:3000/payments/webhook/monnify
   ```
5. **Fulfillment Resolution**: Confirm the terminal checkout resolves and displays the invoice.

### B. Whitelisting IPs on Monnify Dashboard (Manual Guide)
When deploying the production backend, Monnify restricts webhook traffic to registered IPs.
1. Log in to your **Monnify Dashboard** using credentials in `MEMORY.md`.
2. Go to **Settings > API Keys & Webhooks**.
3. Under the **IP Whitelisting** section, add your production backend IP.
4. Set the Webhook URL to: `https://<your-backend-domain>/payments/webhook/monnify`.
5. Save changes (requires 2FA confirmation from account holder).

### C. Webhook Authentication Bypass Rules
In `apps/backend/src/index.ts`, all routes are guarded by a JWT authentication hook (`request.jwtVerify()`) by default.
* Because the Monnify webhook endpoint must receive callback requests directly from Monnify's servers, we added `/payments/webhook` to the path exclusion list.
* Any new webhook providers or third-party webhooks registered in the system must be added to this exemption array in `index.ts`.

---

## 📦 Workspace Package Version Alignment

To prevent code generation and compilation failures:
1. **Prisma Version Congruency**: The `@prisma/client` package version in all packages must always match the development dependencies of `prisma` CLI version.
2. If versions diverge (e.g. `@prisma/client@7.x` and `prisma@6.x`), the client build command (`prisma generate`) will fail with engine initialization errors or missing WASM binary errors (`ENOENT`).
3. Maintain both dependencies pinned at identical versions (currently `^6.2.1`) across all workspace packages and at the root level.

---

## 🖼️ Local Image Upload & Base64 Integration Workflows

### A. Base64 Storage Standard
To support serverless environments (like Vercel) where local filesystems are read-only or ephemeral:
1. All local image uploads are converted to **Base64 Data URLs** on the frontend before sending them to the backend API.
2. The database stores these strings directly in the existing `imageUrl` field.
3. No filesystem writes or third-party file upload plugins (like `@fastify/multipart`) are needed, making the feature highly portable and deployment-friendly.

### B. Fastify Payload Limits
By default, Fastify restricts incoming request bodies to 1MB. Because high-resolution Base64 image payloads can easily exceed this:
1. Always configure the Fastify server instance with `bodyLimit: 10485760` (10MB) in `apps/backend/src/index.ts`.
2. Do not upload raw images larger than 5MB; if needed, implement local canvas resizing or compression on the client side before base64 encoding to save bandwidth and database storage space.


