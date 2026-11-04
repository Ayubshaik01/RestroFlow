# RestroFlow — Enterprise Cloud Restaurant OS & POS
## Complete Supabase, Next.js 16 & Operations Master Guide
**Created & Engineered by ayubshaik01** · *Lead Architect & System Maker*

---

## 🌟 1. System Overview & Architecture

**RestroFlow** is an enterprise-grade cloud restaurant operating system and point-of-sale platform created and architected by **ayubshaik01**. It transforms legacy local restaurant POS setups into a unified, lightning-fast web application built on **Next.js 16 (App Router)** and backed by **Supabase (PostgreSQL 16 + Realtime WebSockets)**.

### Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.4.2 (App Router)** | React 19, Server Components, Route Handlers, Turbopack / Webpack |
| **Styling & UI** | **Tailwind CSS v4** | Base UI & Radix primitives, Lucide icons, responsive touch interfaces |
| **State & Data Fetching** | **TanStack React Query v5** | Stale-while-revalidate caching, optimistic mutations |
| **Database** | **Supabase (PostgreSQL 16)** | Relational schema, foreign keys, cascades, Row-Level Security (RLS) |
| **Realtime Engine** | **Supabase Realtime** | Sub-100ms WebSocket broadcasts on `orders`, `kots`, `tables`, `reservations` |
| **Asset Storage** | **Supabase Storage** | Public bucket (`restaurant-assets`) for logos, receipts, and menu photography |
| **Security & RBAC** | **JWT + Bcrypt + Staff PINs** | Role-based authorization with fast 4-digit PIN terminal handoff |
| **Thermal Printing** | **ESC/POS Web Print** | Browser print engine supporting 80mm & 58mm receipts and cash drawer kicks |

---

## 🔐 2. Team Accounts, Roles & Fast-Switch PINs

RestroFlow comes pre-configured with 5 distinct operational roles to support complete restaurant workflows. Each role has a dedicated demo account and a 4-digit PIN for instant terminal switching:

| Role | Email | Password | Quick PIN | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `owner@demo.local` | `RestroFlow@123` | **`1111`** | **Full System Authority**: Financial reports, tax configuration, staff management, and system security controls. |
| **Manager** | `manager@demo.local` | `RestroFlow@123` | **`2222`** | **Floor & Staff Operations**: Floor layouts, menu adjustments, staff shifts, attendance approvals, refunds, and discounts. |
| **Cashier** | `cashier@demo.local` | `RestroFlow@123` | **`3333`** | **Counter Billing**: Fast touch orders, split bills, multi-tender payments (Cash, Card, UPI, Gift Cards), and day cash closings. |
| **Waiter** | `waiter@demo.local` | `RestroFlow@123` | **`4444`** | **Service Floor**: Table order taking, kitchen fire requests, modifier customizations, and guest assistance alerts. |
| **Chef** | `chef@demo.local` | `RestroFlow@123` | **`5555`** | **Kitchen Operations**: Kitchen Display System (KDS), station ticket preparation, rush priority sorting, and order ready triggers. |

> [!TIP]
> **Fast PIN Switch**: On shared counter terminals, staff do not need to sign out. Simply click the user avatar in the top-right header, select **Switch User**, and enter your 4-digit PIN.

---

## 🛡️ 3. Owner Security & Account Creation Control

To protect your restaurant from unauthorized registrations on the public web, RestroFlow enforces strict **Owner-controlled onboarding**:

1. **Public Registration Disabled by Default**:
   - The database flag `allow_public_signup` on the restaurant entity defaults to `FALSE`.
   - The registration API endpoint (`/api/v1/auth/register`) rejects uninvited signups with **HTTP 403 Forbidden**.
   - The public signup screen (`/signup`) displays an access-restricted security screen directing users to contact their restaurant administrator.

2. **Owner-Only Security Switch**:
   - Only users signed in with the **Owner** role can toggle this behavior.
   - Navigate to **Settings → Security** to view the live status and toggle **Public Account Creation** on or off.

3. **Staff Account Provisioning**:
   - The Owner creates staff accounts from **Settings → Staff**.
   - When creating a team member, the Owner specifies their name, email, system role, and assigns their personal 4-digit PIN for terminal switching.

---

## ⚡ 4. Supabase Setup & Database Configuration

### Step 1: Environment Variables
Create a `.env.local` file in your project root with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 2: Database Schema & Migrations
1. Open your Supabase project dashboard at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in the left sidebar.
3. Run the complete migration file:
   ```
   supabase/migrations/20261104000000_initial_schema.sql
   ```
   *This establishes all 45 tables, custom ENUM types, triggers, Row-Level Security (RLS) policies, and the `supabase_realtime` publication.*

### Step 3: Seed Data & Initial Roles
In the Supabase SQL Editor, run:
```
supabase/seed.sql
```
*This populates the system with:*
- Default permissions across all 12 operational domains.
- Standard restaurant roles (`OWNER`, `MANAGER`, `CASHIER`, `WAITER`, `CHEF`).
- The demo restaurant (`RestroFlow Bistro`) and flagship branch.
- 6 dining room tables across 2 floor sections.
- 4 kitchen stations (Grill, Fry & Sides, Beverages & Bar, Desserts & Bakery).
- Sample menu categories and items.

### Step 4: Storage Bucket
1. In your Supabase dashboard, navigate to **Storage**.
2. Confirm the bucket `restaurant-assets` exists and is marked as **Public**.
3. If not present, click **New Bucket**, name it `restaurant-assets`, and toggle **Public bucket** ON.

---

## 🖥️ 5. Operational Modules Guide

### A. Touch POS Billing (`/pos`)
- **Category Navigation**: Filter items by Burgers, Mains, Sides, Drinks, and Desserts.
- **Portion Selection**: Choose between Full and Half portions with automatic price adjustments.
- **Custom Modifiers**: Attach modifier options (e.g. Extra Cheese, Spice Level, Sauce selection).
- **Split Bills**: Split charges by seat, percentage, or custom amounts across multiple payment tenders (Cash, Card, UPI, Gift Cards).
- **Thermal ESC/POS Printing**: Print 80mm or 58mm customer receipts and kitchen tickets (KOT) with automated cash drawer pulse.

### B. Interactive Floor Plan (`/tables`)
- **Status Indicators**:
  - 🟢 **Available (Emerald)**: Ready for guest seating.
  - 🟡 **Occupied (Amber)**: Active order running.
  - 🔵 **Billed (Blue)**: Bill printed, awaiting settlement.
- **Table Actions**: Move diners between tables, merge open tabs, or release tables upon checkout.
- **Waitlist Queue**: Track walk-in parties, party sizes, waiting times, and seat them directly to available tables.

### C. Kitchen Display System - KDS (`/kds`)
- **Station Routing**: Tickets automatically dispatch to the appropriate station monitor (Grill, Fry, Bar, Cold Prep).
- **Status Workflow**: `NEW` &rarr; `ACCEPTED` &rarr; `PREPARING` &rarr; `READY` &rarr; `SERVED`.
- **Rush Priority**: Staff can mark tickets as **Rush/Priority** to float them to the top with high-visibility amber banners.
- **Audio Chimes**: Automatic audio feedback alerts kitchen staff when new tickets arrive.

### D. Customer QR Table Ordering (`/order/[qrToken]`)
- Patrons scan the table QR code to open the digital menu on their phone without installing an app.
- Diners place orders directly to the kitchen, call their waiter, or request the check from their phone.

### E. Self-Service Kiosk (`/kiosk/[token]`)
- Full-screen kiosk interface for customer self-ordering in quick-service or takeaway settings.
- Features large touch buttons, allergen badges, upsell prompts, and instant order numbers.

### F. Inventory, Recipes & Food Waste (`/inventory`)
- Track raw ingredients with low-stock warnings.
- Linked menu recipes automatically deduct stock as orders are completed.
- Log kitchen waste (spoilage, burning, drops) to maintain exact food cost analytics.

### G. Cash Balancing & Day-End Closing (`/accounting`)
- Reconcile physical cash drawers at shift change or closing.
- Enter opening float and counted cash; RestroFlow automatically computes variance against recorded POS transactions.
- Generate GST tax reports, profit & loss summaries, and branch comparisons.

---

## 🛠️ 6. API Route Reference

RestroFlow provides a full suite of **142 API routes** organized by domain:

- **Authentication**: `/api/v1/auth/login`, `/logout`, `/me`, `/pin-switch`, `/register`, `/setup-status`, `/2fa/*`
- **Orders**: `/api/v1/orders`, `/orders/[id]`, `/orders/[id]/items`, `/orders/[id]/checkout`, `/orders/[id]/cancel`, `/orders/[id]/print/*`
- **Kitchen (KDS)**: `/api/v1/kds/tickets`, `/kds/stations`, `/kds/progress`, `/kds/performance`, `/kds/incoming/*`
- **Tables & Floors**: `/api/v1/tables`, `/tables/floors`, `/tables/layout`, `/tables/requests`, `/tables/bulk`, `/waitlist`
- **Menu**: `/api/v1/menu/items`, `/menu/categories`, `/menu/stations`, `/menu/items/upload-image`
- **Inventory**: `/api/v1/inventory/ingredients`, `/inventory/purchase-orders`, `/inventory/suppliers`, `/inventory/waste`
- **Accounting & HR**: `/api/v1/accounting/expenses`, `/accounting/closing`, `/accounting/profit-loss`, `/accounting/gst`, `/attendance`, `/hr/*`
- **Customer & Marketing**: `/api/v1/customers`, `/gift-cards`, `/marketing/coupons`, `/marketing/promotions`, `/marketing/campaigns`
- **Public Endpoints**: `/api/v1/public/menu/[qrToken]/*`, `/api/v1/public/kiosk/[token]/*`

---

## 🚀 7. Running & Deploying RestroFlow

### Local Development
```bash
# Install dependencies
npm install

# Start development server with Turbopack
npm run dev
```

### Type Checking
```bash
# Verify TypeScript strict typing
npm run typecheck
```

### Production Build
```bash
# Build optimized Next.js production bundle
npm run build

# Start production server
npm start
```

### Deploying to Cloud (Vercel / Netlify / Render)
1. Push your repository to GitHub / GitLab.
2. Link your repository in **Vercel** or your hosting provider.
3. Add your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy! RestroFlow deploys as a serverless or containerized web application with zero extra configuration.
