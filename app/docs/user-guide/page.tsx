import type { Metadata } from "next";
import Link from "next/link";
import { DocList, DocPage, DocSection } from "@/components/marketing/doc-page";

export const metadata: Metadata = {
  title: "User Guide & Operations Manual — RestroFlow",
  description:
    "Comprehensive manual for staff roles, Owner security controls, POS billing, KDS routing, table layout, QR ordering, and Supabase cloud operations.",
};

export default function UserGuidePage() {
  return (
    <DocPage title="RestroFlow User Guide & Operations Manual" updated="November 2026">
      <DocSection heading="1. Introduction & Overview">
        <p>
          <strong className="text-foreground">RestroFlow</strong> was created and engineered by{" "}
          <strong className="text-foreground">ayubshaik01</strong> (Lead Architect &amp; System Maker). It is an intelligent, high-velocity cloud restaurant
          operating system and point-of-sale platform built with Next.js 16 (App Router), React 19, and Supabase
          (PostgreSQL + Realtime WebSockets).
        </p>
        <p>
          Unlike legacy desktop POS systems that require local server hardware and fragile LAN configurations,
          RestroFlow runs natively in any modern web browser across touch terminals, kitchen screens, waiter handhelds,
          and customer smartphones, maintaining continuous sub-100ms real-time synchronization.
        </p>
      </DocSection>

      <DocSection heading="2. Team Roles, Credentials & Fast-Switch PINs">
        <p>
          RestroFlow provides strict Role-Based Access Control (RBAC). For busy service rushes on shared counter
          terminals, staff can switch identities instantly using their assigned 4-digit PIN without typing full emails
          or passwords.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card p-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="pb-3">Role</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">PIN</th>
                <th className="pb-3">Access & Responsibilities</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-foreground">
              <tr>
                <td className="py-2.5 font-medium text-primary">Owner</td>
                <td className="py-2.5 font-mono text-xs">owner@demo.local</td>
                <td className="py-2.5 font-mono font-semibold">1111</td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  Full control: financial audits, tax settings, staff management, and system security controls.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium">Manager</td>
                <td className="py-2.5 font-mono text-xs">manager@demo.local</td>
                <td className="py-2.5 font-mono font-semibold">2222</td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  Floor configuration, menu updates, staff shifts, attendance, inventory approvals, and voiding bills.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium">Cashier</td>
                <td className="py-2.5 font-mono text-xs">cashier@demo.local</td>
                <td className="py-2.5 font-mono font-semibold">3333</td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  POS counter billing, split bills, multi-tender payment processing, cash drawer closings, and receipts.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium">Waiter</td>
                <td className="py-2.5 font-mono text-xs">waiter@demo.local</td>
                <td className="py-2.5 font-mono font-semibold">4444</td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  Table order taking, guest seatings, modifiers, kitchen fire requests, and table service alerts.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 font-medium">Chef</td>
                <td className="py-2.5 font-mono text-xs">chef@demo.local</td>
                <td className="py-2.5 font-mono font-semibold">5555</td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  Kitchen Display System (KDS), station ticket preparation, rush priority sorting, and ready alerts.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Default password for all initial accounts: <code className="rounded bg-muted px-1 font-mono">RestroFlow@123</code>
        </p>
      </DocSection>

      <DocSection heading="3. Owner Security & Account Creation Control">
        <p>
          To prevent unauthorized personnel or outside visitors from signing up on the public internet,{" "}
          <strong className="text-foreground">Public Account Creation is locked down by default</strong>.
        </p>
        <DocList
          items={[
            <>
              <strong className="text-foreground">Lockdown Enforcement:</strong> The registration API endpoint (
              <code>/api/v1/auth/register</code>) and the signup page (<code>/signup</code>) automatically verify the
              restaurant&rsquo;s security setting. If disabled, external registration requests are denied with HTTP 403.
            </>,
            <>
              <strong className="text-foreground">Owner Toggle:</strong> Only users signed in with the{" "}
              <span className="text-primary font-medium">Owner</span> role can navigate to{" "}
              <strong className="text-foreground">Settings &gt; Security</strong> and toggle the &ldquo;Public Account
              Creation&rdquo; switch.
            </>,
            <>
              <strong className="text-foreground">Staff Provisioning:</strong> The Owner adds new employees directly from{" "}
              <strong className="text-foreground">Settings &gt; Staff</strong> by specifying their name, email, role,
              and assigning their personal 4-digit PIN for instant terminal switching.
            </>,
          ]}
        />
      </DocSection>

      <DocSection heading="4. Daily Operational Modules">
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">A. POS Billing &amp; Counter Checkout (/pos)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap categories or use barcode/search to add items. Choose portion size (Full / Half) and tap modifiers.
              Split bills by seat or amount, apply coupon discounts, select payment tender (Cash, Card, UPI, Gift Card),
              and trigger instant 80mm/58mm thermal receipts with automatic cash drawer kick.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">B. Interactive Floor Plan &amp; Tables (/tables)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor your dining room visually with color-coded status tiles: <strong>Available (Emerald)</strong>,{" "}
              <strong>Occupied (Amber)</strong>, and <strong>Billed (Blue)</strong>. Tap a table to view active guest
              tabs, transfer diners to another table, merge tabs, or manage walk-in waitlists with SMS notifications.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">C. Kitchen Display System - KDS (/kds)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Orders automatically route to designated station screens (Grill, Fry, Bar, Cold Prep). Tickets advance
              through <strong>NEW &rarr; PREPARING &rarr; READY &rarr; SERVED</strong> with clear elapsed timer badges.
              High-priority tickets trigger visual rush banners and chime alerts.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">D. Contactless Table QR Ordering (/order/[qrToken])</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Guests scan the QR code sticker on their table with any smartphone browser (no app download required).
              They browse dietary-tagged menus, place food orders directly into the kitchen, call the server, or
              request the final bill.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">E. Inventory, Recipes &amp; Food Waste (/inventory)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track raw ingredients down to gram and milliliter units. As menu items sell, ingredients automatically
              deplete from stock according to linked recipes. Log spoiled or burned food under Food Waste to keep
              accurate margins.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="font-semibold text-foreground">F. Accounting &amp; Day-End Cash Closing (/accounting)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Perform end-of-shift cash drawer reconciliations: enter starting cash float, count physical bills, and
              instantly compare against expected POS cash transactions to identify any over/short variance before
              finalizing the register.
            </p>
          </div>
        </div>
      </DocSection>

      <DocSection heading="5. Supabase Database Configuration">
        <p>
          RestroFlow connects to Supabase via standard PostgreSQL connection pooling and the Supabase JavaScript SDK.
          Environment keys are managed in <code>.env.local</code>:
        </p>
        <div className="rounded-xl border border-border/60 bg-card p-4 text-xs font-mono">
          <p>NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...</p>
          <p>SUPABASE_SERVICE_ROLE_KEY=sb_secret_...</p>
        </div>
        <p className="text-sm">
          Database migrations, schema definitions, and seed data reside under the{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">/supabase</code> folder and can be
          executed directly via the Supabase SQL Editor or Supabase CLI.
        </p>
      </DocSection>

      <DocSection heading="6. System Authorship & Maker">
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
          <p className="font-semibold text-foreground">
            Created &amp; Engineered by ayubshaik01
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            RestroFlow was conceived, architected, and built from the ground up by{" "}
            <strong className="text-foreground">ayubshaik01</strong> (Lead Architect &amp; System Maker). For technical
            contributions, enterprise integrations, or multi-branch deployments, consult the official repository guide.
          </p>
        </div>
      </DocSection>
    </DocPage>
  );
}

