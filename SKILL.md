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
