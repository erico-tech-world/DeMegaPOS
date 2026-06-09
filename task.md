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
  - `[ ]` Verify E2E placing order in Back-Office POS -> Kitchen displays instantly via WebSocket
  - `[ ]` Verify E2E paying via terminal -> POS spinner resolves and order turns green automatically
  - `[ ]` Verify E2E kitchen marks order as "Ready" -> Back-Office reflects status while payment status remains unchanged
  - `[ ]` Perform final monorepo compilation check (`pnpm build`)
