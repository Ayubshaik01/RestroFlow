const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} = require("docx");

function createHeaderCell(text, widthPercent = 25) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: "1E3A8A", type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: true,
            color: "FFFFFF",
            font: "Segoe UI",
            size: 20,
          }),
        ],
      }),
    ],
  });
}

function createDataCell(text, widthPercent = 25, isAlt = false, isCode = false, isBold = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: isAlt ? { fill: "F8FAFC", type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: isBold,
            font: isCode ? "Consolas" : "Segoe UI",
            size: isCode ? 18 : 19,
            color: isCode ? "0F172A" : "334155",
          }),
        ],
      }),
    ],
  });
}

function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 24, color: "2563EB" },
      top: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
            margins: { top: 140, bottom: 140, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: title + " ",
                    bold: true,
                    color: "1E3A8A",
                    font: "Segoe UI",
                    size: 20,
                  }),
                  new TextRun({
                    text,
                    color: "1E293B",
                    font: "Segoe UI",
                    size: 19,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: opts.before ?? 120, after: opts.after ?? 120 },
    children: [
      new TextRun({
        text,
        font: "Segoe UI",
        size: opts.size ?? 21,
        color: opts.color ?? "334155",
        bold: opts.bold ?? false,
        italics: opts.italics ?? false,
      }),
    ],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 380, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Segoe UI",
        size: 32,
        color: "1E3A8A",
      }),
    ],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Segoe UI",
        size: 26,
        color: "2563EB",
      }),
    ],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        font: "Segoe UI",
        size: 22,
        color: "0F172A",
      }),
    ],
  });
}

function codeBlock(lines) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      top: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "CBD5E1" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map(
              (line) =>
                new Paragraph({
                  spacing: { before: 20, after: 20 },
                  children: [
                    new TextRun({
                      text: line,
                      font: "Consolas",
                      size: 17,
                      color: "0F172A",
                    }),
                  ],
                })
            ),
          }),
        ],
      }),
    ],
  });
}

async function buildMasterDocument() {
  const elements = [
    // TITLE / HEADER
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: "RESTROFLOW",
          bold: true,
          font: "Segoe UI",
          size: 52,
          color: "1E3A8A",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 140 },
      children: [
        new TextRun({
          text: "The Intelligent Cloud Restaurant Operating System & POS",
          italics: true,
          font: "Segoe UI",
          size: 26,
          color: "2563EB",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 20, after: 260 },
      children: [
        new TextRun({
          text: "Engineered, Architected & Created by ",
          font: "Segoe UI",
          size: 21,
          color: "64748B",
        }),
        new TextRun({
          text: "ayubshaik01",
          bold: true,
          font: "Segoe UI",
          size: 23,
          color: "0F172A",
        }),
        new TextRun({
          text: " · Lead Architect & System Maker",
          font: "Segoe UI",
          size: 21,
          color: "64748B",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 320 },
      children: [
        new TextRun({
          text: "Master Architecture, Full Feature Specifications, Complete Database Blueprint & Operations Guide",
          bold: true,
          font: "Segoe UI",
          size: 20,
          color: "475569",
        }),
      ],
    }),

    createCallout(
      "Architectural Statement by ayubshaik01:",
      "RestroFlow was built to eliminate the fragility, hardware lock-in, and operational bottlenecks of legacy restaurant software. By unifying billing, multi-station kitchen display systems, live table layouts, customer QR ordering, recipe inventory deduction, shift accounting, and delivery dispatch into a pure-web distributed platform powered by Next.js 16 and Supabase Realtime, RestroFlow brings enterprise cloud reliability to modern dining establishments worldwide."
    ),

    // SECTION 1: EXECUTIVE ENGINEERING PHILOSOPHY
    h1("1. Executive Engineering Philosophy & Problem Solved"),
    p(
      "Traditional restaurant Point of Sale (POS) software suffers from major systemic shortcomings that cost hospitality businesses significant revenue, time, and customer satisfaction every single day:"
    ),
    p(
      "• Vulnerability to Local Hardware Crashes: Legacy POS platforms rely on a local desktop computer acting as an impromptu LAN server. If that PC experiences an OS crash, hard drive failure, or power glitch, every terminal in the restaurant ceases to operate, stopping billing during rush hours.",
      { before: 40, after: 40 }
    ),
    p(
      "• Fragile Local Network Synchronization: Local socket connections between mobile waiter terminals and the counter frequently disconnect, causing missing food orders, double-firing tickets to the kitchen, and bill discrepancy.",
      { before: 40, after: 40 }
    ),
    p(
      "• Manual Nightly Backups & Data Loss: When local database backups fail or are neglected, hardware failures result in permanent loss of sales history, inventory records, and customer loyalty balances.",
      { before: 40, after: 40 }
    ),
    p(
      "• Proprietary Hardware Lock-In: Operators are forced to purchase overpriced, outdated touch displays running ancient embedded operating systems.",
      { before: 40, after: 120 }
    ),
    p(
      "RestroFlow completely inverts this paradigm. Engineered from the ground up by ayubshaik01, RestroFlow is a 100% web-native cloud application. It runs inside any standard browser (Chrome, Safari, Edge, Firefox) on iPads, Android tablets, touchscreen monitors, desktop PCs, and smartphones. All state is persisted to enterprise cloud PostgreSQL in Supabase, and every terminal communicates through sub-100ms WebSocket broadcasts. A tablet dropped on the floor can be replaced in 10 seconds simply by opening the URL on another device and entering a 4-digit PIN."
    ),

    // SECTION 2: ARCHITECTURE TOPOLOGY
    h1("2. Distributed System Topology & Technology Stack"),
    p(
      "The platform operates across four decoupled, high-performance tiers engineered for high availability, zero latency, and strict security:"
    ),

    codeBlock([
      "+---------------------------------------------------------------------------------------------------------+",
      "|                                       RESTROFLOW SYSTEM TOPOLOGY                                        |",
      "+---------------------------------------------------------------------------------------------------------+",
      "                                                                                                           ",
      "  TIER 1: CLIENT SURFACES (Responsive Touch Web Apps)                                                      ",
      "  +---------------------+   +---------------------+   +---------------------+   +---------------------+   ",
      "  |   POS Touch Counter |   | Kitchen KDS Monitor |   |   Waiter Handheld   |   | Guest QR Table Scan |   ",
      "  |    (/pos - 80mm)    |   |    (/kds - Audio)   |   |  (/tables - Touch)  |   |  (/order/[qrToken]) |   ",
      "  +----------+----------+   +----------+----------+   +----------+----------+   +----------+----------+   ",
      "             |                         |                         |                         |              ",
      "             +-------------------------+------------+------------+-------------------------+              ",
      "                                                    |                                                     ",
      "                                                    v                                                     ",
      "  TIER 2: RUNTIME & APPLICATION ENGINE (Next.js 16.4.2 App Router on Node 22+)                             ",
      "  +----------------------------------------------------------------------------------------------------+  ",
      "  | - React 19 Server Components (RSC) + Streaming Server-Side Rendering                               |  ",
      "  | - 142 REST Route Handlers (/api/v1/*) with Zod Request Validation                                  |  ",
      "  | - TanStack React Query v5 (Optimistic UI mutations + stale-while-revalidate client cache)           |  ",
      "  | - Security Guard: RBAC Permission Evaluation + Bcrypt PIN Switch Engine + Owner Gatekeeper         |  ",
      "  | - Pricing Core: Tax-Inclusive/Exclusive Engine, Modifier Math, Split Tenders & Cash Drawer Kick     |  ",
      "  +-------------------------------------------------+--------------------------------------------------+  ",
      "                                                    |                                                     ",
      "                                                    v                                                     ",
      "  TIER 3: CLOUD DATA & REALTIME SYNC (Supabase Managed PostgreSQL)                                         ",
      "  +----------------------------------------------------------------------------------------------------+  ",
      "  | - PostgreSQL 16 Relational Engine: 45 Tables with Cascading Constraints & Audit Triggers           |  ",
      "  | - Row-Level Security (RLS) Policies segregating Multi-Tenant Locations                             |  ",
      "  | - Realtime WebSocket Engine: WAL logical replication broadcasts on `orders`, `kots`, `tables`      |  ",
      "  +-------------------------------------------------+--------------------------------------------------+  ",
      "                                                    |                                                     ",
      "                                                    v                                                     ",
      "  TIER 4: ASSETS & PRINT SERVICES                                                                          ",
      "  +----------------------------------------------------------------------------------------------------+  ",
      "  | - Supabase Storage S3 API: Public Bucket `restaurant-assets` for Menu Photography & Logos          |  ",
      "  | - Web Print Bridge: ESC/POS Thermal 80mm/58mm CSS Rendering Engine with Cash Drawer Kick Pulse     |  ",
      "  +----------------------------------------------------------------------------------------------------+  ",
    ]),

    // SECTION 3: ROLES & PIN ENGINE
    h1("3. Multi-Role RBAC & The Fast-Switch PIN Engine"),
    p(
      "Hospitality environments require strict role segregation without slowing down high-speed counter handoffs. RestroFlow provides Role-Based Access Control across 12 distinct permission domains combined with a 4-digit PIN Quick-Switch mechanism:"
    ),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Role Name", 16),
            createHeaderCell("Default Account", 24),
            createHeaderCell("PIN", 10),
            createHeaderCell("Authorized Domain Capabilities", 50),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("Owner", 16, false, false, true),
            createDataCell("owner@demo.local", 24, false, true),
            createDataCell("1111", 10, false, true, true),
            createDataCell("Ultimate authority: Financial P&L, GST audits, staff payroll, security lockdown toggle, staff provisioning, and destructive overrides.", 50),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("Manager", 16, true, false, true),
            createDataCell("manager@demo.local", 24, true, true),
            createDataCell("2222", 10, true, true, true),
            createDataCell("Floor plan configuration, table layouts, menu & pricing adjustments, attendance approvals, stock approvals, and bill voiding.", 50, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("Cashier", 16, false, false, true),
            createDataCell("cashier@demo.local", 24, false, true),
            createDataCell("3333", 10, false, true, true),
            createDataCell("POS counter billing, split check processing, cash drawer kick management, multi-tender transactions, day closing reconciliations.", 50),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("Waiter", 16, true, false, true),
            createDataCell("waiter@demo.local", 24, true, true),
            createDataCell("4444", 10, true, true, true),
            createDataCell("Dining room floor access, table order taking, guest seatings, modifiers, kitchen round firing, service call resolution.", 50, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("Chef", 16, false, false, true),
            createDataCell("chef@demo.local", 24, false, true),
            createDataCell("5555", 10, false, true, true),
            createDataCell("Kitchen Display System (KDS), station filtering, priority rush sorting, ticket status progression (Preparing, Ready, Served).", 50),
          ],
        }),
      ],
    }),

    h2("PIN Switch Technical Implementation"),
    p(
      "When a staff member clicks 'Switch User' and enters their PIN, the client sends a POST request to `/api/v1/auth/pin-switch` with `{ pin: '3333' }`. The backend matches the Bcrypt hash against active staff members within the current restaurant branch, generates a new scoped session JWT, and writes an encrypted HTTP-only cookie. The active screen updates immediately with that user's exact permissions without requiring a full browser reload or email credential entry."
    ),

    h2("Owner Security Gatekeeper & Registration Lockdown"),
    p(
      "To prevent unauthorized users from registering accounts when the POS is hosted on public domains, ayubshaik01 designed a multi-layer gatekeeper:"
    ),
    p(
      "1. Database Flag: The `restaurants` table contains `allow_public_signup BOOLEAN NOT NULL DEFAULT FALSE`.",
      { before: 30, after: 30 }
    ),
    p(
      "2. Route Interceptor: The signup handler `/api/v1/auth/register` inspects the restaurant record. If false, it terminates with HTTP 403 Forbidden.",
      { before: 30, after: 30 }
    ),
    p(
      "3. UI Lock Shield: The public `/signup` screen checks setup status and renders a security shield blocking public forms.",
      { before: 30, after: 30 }
    ),
    p(
      "4. Owner Control Panel: Only an authenticated Owner can access Settings > Security to toggle public registration or Settings > Staff to provision staff members directly and set their 4-digit PIN.",
      { before: 30, after: 120 }
    ),

    // SECTION 4: DETAILED OPERATIONAL MANUAL
    h1("4. Comprehensive Subsystem & Operational Manual"),

    h2("4.1 POS Billing, Touchscreen Navigation & Modifiers (/pos)"),
    p(
      "The POS counter is engineered for rapid execution during high-volume lunch and dinner rushes:"
    ),
    p(
      "• Responsive Category Grid: Menu items are organized into clear visual categories (Burgers, Mains, Sides, Beverages, Desserts). Cashiers can filter by tapping category tabs or by scanning physical barcode labels via USB/Bluetooth scanner wedges.",
      { before: 40, after: 40 }
    ),
    p(
      "• Half vs Full Portions: Items that support half-portions (e.g. half-chicken vs whole-chicken) toggle seamlessly, automatically recalculating inclusive base prices without requiring separate duplicate menu entries.",
      { before: 40, after: 40 }
    ),
    p(
      "• Modifier Groups & Custom Kitchen Notes: Tapping an item opens its modifier sheet (e.g., Temperature: Rare/Medium/Well-Done; Toppings: Bacon, Jalapenos; Sauce choices). Free-text kitchen notes (e.g., 'Extra crispy, allergen: nut allergy') attach directly to the line item snapshot.",
      { before: 40, after: 40 }
    ),
    p(
      "• Multi-Tender Split Settlement: Cashiers can split a $150 bill across multiple guests: Guest A pays $50 in Cash, Guest B pays $50 via Card, and Guest C pays $50 via UPI QR code. The system verifies total coverage before closing the check.",
      { before: 40, after: 40 }
    ),
    p(
      "• ESC/POS Thermal Printing & Drawer Kick: Upon settlement confirmation, the POS triggers an ESC/POS print job formatted for standard 80mm or 58mm thermal receipt paper. The print payload includes a standard cash drawer kick pulse command (`ESC p 0 25 250`), popping the physical cash drawer automatically for cash transactions.",
      { before: 40, after: 120 }
    ),

    h2("4.2 Interactive Floor Plan & Dining Room Tables (/tables)"),
    p(
      "RestroFlow provides a visual, drag-and-drop floor plan management surface:"
    ),
    p(
      "• Dynamic Color-Coded Table Statuses: Every table displays its live state in real time: Available (Emerald Green), Occupied (Amber Yellow), Billed/Awaiting Settlement (Blue), and Reserved (Purple).",
      { before: 40, after: 40 }
    ),
    p(
      "• Table Moves & Merges: If guests request to move from Table 2 to Table 8 on the patio, the waiter taps 'Move Table', selecting Table 8. All active items, running totals, and pending kitchen tickets migrate immediately. Similarly, if two parties join, 'Merge Table' combines both tabs into a single consolidated master order.",
      { before: 40, after: 40 }
    ),
    p(
      "• Service Call Alerts: When patrons tap 'Call Waiter' or 'Request Bill' from their table QR code, the table tile pulses on the floor plan and triggers an audible chime on waiter tablets, displaying the exact table number and request time.",
      { before: 40, after: 40 }
    ),
    p(
      "• Walk-In Waitlist Queue: Manages high-traffic door operations. Hosts log walk-in party names, phone numbers, and guest counts. As tables are cleared, the system auto-suggests the best matching table capacity and seats the party with a single tap.",
      { before: 40, after: 120 }
    ),

    h2("4.3 Kitchen Display System (KDS) & Multi-Station Routing (/kds)"),
    p(
      "The KDS replaces lost paper kitchen slips with high-visibility, real-time monitors:"
    ),
    p(
      "• Multi-Station Auto-Routing: Incoming orders automatically route line items to their respective physical station screens: Grill Station (steaks, burgers), Fry Station (wings, fries), Bar/Beverages (cocktails, beers), and Desserts & Bakery. Chefs see only the items their station is responsible for preparing.",
      { before: 40, after: 40 }
    ),
    p(
      "• Round Firing & Additional Orders: When guests order additional rounds of drinks or dessert mid-meal, RestroFlow creates subsequent round tickets (`KOT-1042-R2`) clearly distinguishing new additions from already-served courses.",
      { before: 40, after: 40 }
    ),
    p(
      "• Urgency Timers & Rush Override: Tickets display an active countdown timer: Green (<10 min), Amber (10-20 min), and Red Flash (>20 min). Servers can flag a ticket as 'Rush / Priority', which immediately floats the ticket to the front of the kitchen queue with an amber priority badge.",
      { before: 40, after: 40 }
    ),
    p(
      "• Station Performance Telemetry: The KDS aggregates analytics per station, tracking tickets completed per hour and average minutes to ready, identifying kitchen bottlenecks before they impact guest satisfaction.",
      { before: 40, after: 120 }
    ),

    h2("4.4 Contactless Table QR Ordering & Customer Kiosks"),
    p(
      "RestroFlow expands restaurant revenue through friction-free guest self-ordering:"
    ),
    p(
      "• Table QR Code Ordering (/order/[qrToken]): Every dining table has a unique cryptographic QR token. Guests scan the QR with their smartphone camera to view a beautiful, mobile-optimized digital menu. Guests can customize modifiers, enter their name, place their food order directly to the kitchen, and call for service without waiting for a server.",
      { before: 40, after: 40 }
    ),
    p(
      "• Self-Service Ordering Kiosks (/kiosk/[token]): Fullscreen Progressive Web App (PWA) kiosk mode designed for standalone touchscreens at entrances or drive-thrus. Patrons select Dine-In or Takeaway, browse dietary badges, add upsell combos, and receive an automated order pickup number with zero staff interaction.",
      { before: 40, after: 120 }
    ),

    h2("4.5 Inventory, Recipe Costing & Food Waste Tracking (/inventory)"),
    p(
      "Food cost control is fully automated through RestroFlow's relational inventory engine:"
    ),
    p(
      "• Ingredient BOM (Bill of Materials): Every menu item is linked to raw ingredient recipes. For example, a 'RestroFlow Signature Double Burger' links to: 1 Brioche Bun, 200g Prime Beef Patty, 2 Cheddar Slices, and 30ml Secret Sauce.",
      { before: 40, after: 40 }
    ),
    p(
      "• Real-Time Stock Depletion: When an order is completed, the depletion engine decrements raw ingredients from active FIFO/FEFO stock batches. If an ingredient drops below its minimum threshold, an automated Low Stock alert notifies management.",
      { before: 40, after: 40 }
    ),
    p(
      "• Food Waste Logging: Chefs log spoiled ingredients, burned items, or dropped dishes directly from the kitchen, specifying the reason (SPOILAGE, PREPARATION_ERROR, DROPPED, EXPIRED). RestroFlow records the exact financial loss based on the ingredient's unit cost at that moment.",
      { before: 40, after: 120 }
    ),

    h2("4.6 Shift Cash Balancing & Day-End Register Closing (/accounting)"),
    p(
      "Prevents cash slippage and discrepancies through strict reconciliation:"
    ),
    p(
      "1. Opening Float: At the beginning of a shift, the cashier enters the initial cash float (e.g. $200.00).",
      { before: 30, after: 30 }
    ),
    p(
      "2. POS Sales Tracking: During the day, every cash payment increases the drawer balance, while authorized cash payouts (e.g. ice delivery: $25.00) decrease it.",
      { before: 30, after: 30 }
    ),
    p(
      "3. Blind Count & Variance: At shift close, the cashier enters their physical currency count. The system compares Counted Cash against Expected Cash (`Opening Float + Cash Sales - Cash Expenses`). Any discrepancy is flagged as OVER or SHORT with an immutable audit record.",
      { before: 30, after: 120 }
    ),

    h2("4.7 HR, Shift Scheduling, Attendance & Payroll (/hr, /attendance)"),
    p(
      "RestroFlow integrates complete human resources and payroll workflows:"
    ),
    p(
      "• Shift Rostering: Managers build weekly staff rosters, assigning shifts to servers, cashiers, and kitchen prep cooks.",
      { before: 30, after: 30 }
    ),
    p(
      "• Attendance Clock-In/Out: Staff clock in and out from their personal PIN or terminal, recording exact work minutes.",
      { before: 30, after: 30 }
    ),
    p(
      "• Automated Payroll Runs: Aggregates hours worked, applies hourly wages or monthly salaries, pools server tips, and calculates net pay stubs with leave deductions.",
      { before: 30, after: 120 }
    ),

    h2("4.8 Delivery Dispatch Engine (/delivery)"),
    p(
      "Handles direct-to-consumer delivery orders without paying aggregator commissions:"
    ),
    p(
      "• Zone Configuration: Managers define delivery zones by postal codes / pincodes, setting minimum order values, custom delivery fees, and estimated transit times.",
      { before: 30, after: 30 }
    ),
    p(
      "• Driver Dispatch: Incoming delivery orders are assigned to in-house delivery drivers with customer address details and phone contact shortcuts.",
      { before: 30, after: 120 }
    ),

    // SECTION 5: MATHEMATICAL FORMULAS
    h1("5. Mathematical Formulas & Calculation Engines"),
    p(
      "To ensure zero rounding errors across international currencies and tax regimes, RestroFlow utilizes high-precision integer and two-decimal calculation algorithms:"
    ),

    h2("5.1 Tax-Inclusive Pricing Formula"),
    p(
      "Under tax-inclusive regimes (such as European VAT or Indian GST MRP), menu prices already contain tax. The system extracts the tax amount and taxable base value cleanly:"
    ),
    codeBlock([
      "  TaxRateMultiplier = 1 + (TaxRatePercent / 100)                                                       ",
      "  LineTotal         = RoundToTwoDecimals(InclusiveUnitPrice * Quantity)                                ",
      "  TaxableValue      = RoundToTwoDecimals(LineTotal / TaxRateMultiplier)                                 ",
      "  TaxAmount         = LineTotal - TaxableValue                                                         ",
      "                                                                                                       ",
      "  Example: $10.50 inclusive price, 5% GST, quantity 2:                                                 ",
      "  LineTotal    = 10.50 * 2 = $21.00                                                                    ",
      "  TaxableValue = 21.00 / 1.05 = $20.00                                                                ",
      "  TaxAmount    = 21.00 - 20.00 = $1.00                                                                 ",
    ]),

    h2("5.2 Cash Drawer Balancing Formula"),
    codeBlock([
      "  ExpectedCash = OpeningFloat + TotalCashSalesRecorded - AuthorizedCashExpensesPaidOut                ",
      "  Variance     = PhysicalCountedCash - ExpectedCash                                                    ",
      "                                                                                                       ",
      "  If Variance == 0.00 -> Status: BALANCED                                                              ",
      "  If Variance >  0.00 -> Status: OVERAGE   (Cash surplus in drawer)                                    ",
      "  If Variance <  0.00 -> Status: SHORTAGE  (Cash deficit requiring manager sign-off)                   ",
    ]),

    // SECTION 6: COMPLETE DATABASE BLUEPRINT
    h1("6. Complete Database Architecture Blueprint (All 45 Tables)"),
    p(
      "Below is the complete database dictionary established in Supabase PostgreSQL:"
    ),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Table Name", 22),
            createHeaderCell("Primary Key", 16),
            createHeaderCell("Key Foreign Keys", 26),
            createHeaderCell("Domain Function & Stored Attributes", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("restaurants", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("None", 26),
            createDataCell("Root tenant entity, name, currency, allow_public_signup flag, logo URL.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("branches", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("restaurant_id -> restaurants", 26, true, true),
            createDataCell("Physical store location, tax regime, tax mode (INCLUSIVE/EXCLUSIVE), address.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("permissions", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("None", 26),
            createDataCell("System permission codes across all 12 operational domains.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("roles", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("restaurant_id -> restaurants", 26, true, true),
            createDataCell("Standard roles: OWNER, MANAGER, CASHIER, WAITER, CHEF.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("role_permissions", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("role_id, permission_id", 26, false, true),
            createDataCell("Many-to-many junction mapping permissions to specific roles.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("users", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("role_id, restaurant_id", 26, true, true),
            createDataCell("Staff directory, email, Bcrypt password_hash, 4-digit PIN hash.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("user_branches", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("user_id, branch_id", 26, false, true),
            createDataCell("Assigns employee access to specific restaurant branches.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("floors", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id -> branches", 26, true, true),
            createDataCell("Dining room floor sections (Main Hall, Patio, Bar, Rooftop).", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("tables", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("floor_id, branch_id", 26, false, true),
            createDataCell("Individual dining tables, capacity, number, status (AVAILABLE, OCCUPIED, BILLED).", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("table_requests", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("table_id -> tables", 26, true, true),
            createDataCell("Real-time guest service requests (WAITER call, BILL request) with resolved state.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("waitlist_entries", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Walk-in party queue, guest name, phone, party size, seated status.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("reservations", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, table_id", 26, true, true),
            createDataCell("Scheduled table bookings, guest count, reserved date/time, confirmation state.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("menu_categories", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Catalog groupings (Burgers, Pizzas, Sides, Beverages, Desserts).", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("kitchen_stations", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id -> branches", 26, true, true),
            createDataCell("Kitchen physical stations: Grill Station, Fryer, Bar, Dessert Prep.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("modifier_groups", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Modifier headers (Meat Temperature, Choice of Cheese, Beverage Size).", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("modifier_options", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("group_id -> modifier_groups", 26, true, true),
            createDataCell("Selectable options (Medium Rare, Cheddar, Large +$1.50).", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("menu_items", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("category_id, station_id", 26, false, true),
            createDataCell("Dishes, full price, half price, tax rate %, dietary tags, image URL.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("orders", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, table_id, customer_id", 26, true, true),
            createDataCell("Core order header: status (OPEN, PAID, CANCELLED), subtotal, tax, total, guest count.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("order_items", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("order_id, menu_item_id", 26, false, true),
            createDataCell("Individual line items, unit price snapshot, quantity, line total, notes.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("kots", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("order_id, kitchen_station_id", 26, true, true),
            createDataCell("Kitchen Order Tickets, ticket number, round number, status, rush priority.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("kot_items", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("kot_id, order_item_id", 26, false, true),
            createDataCell("Links specific order items and quantities to a designated kitchen ticket.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("payments", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("order_id -> orders", 26, true, true),
            createDataCell("Settlement transactions: CASH, CARD, UPI, GIFT_CARD, tendered, change given.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("refunds", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("order_id -> orders", 26, false, true),
            createDataCell("Post-settlement refunds, reason, refunded amount, authorized manager.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("cash_closings", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, closed_by_id", 26, true, true),
            createDataCell("Day/shift closings: opening float, cash sales, expenses, counted cash, variance.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("ingredients", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Raw inventory stock: name, measurement unit (KG, LTR, PCS), cost per unit.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("recipe_ingredients", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("menu_item_id, ingredient_id", 26, true, true),
            createDataCell("Bill of materials: recipe formulas mapping ingredients to menu items.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("suppliers", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Vendor directory: company name, contact, payment terms, delivery schedule.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("purchase_orders", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, supplier_id", 26, true, true),
            createDataCell("Procurement purchase orders, order status (DRAFT, ORDERED, RECEIVED), total cost.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("waste_logs", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id, ingredient_id", 26, false, true),
            createDataCell("Kitchen waste records: quantity spoiled/dropped, waste reason, financial cost.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("gift_cards", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("restaurant_id -> restaurants", 26, true, true),
            createDataCell("Customer gift cards: unique code, initial balance, remaining balance, active state.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("coupons", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("restaurant_id -> restaurants", 26, false, true),
            createDataCell("Promotional discount coupons: code, percentage/flat value, min spend, expiry.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("attendance", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, user_id", 26, true, true),
            createDataCell("Employee timecards: clock_in_at, clock_out_at, work duration, shift note.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("shifts", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id, user_id", 26, false, true),
            createDataCell("Employee scheduled shifts: starts_at, ends_at, assigned station.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("expenses", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, created_by_id", 26, true, true),
            createDataCell("Store operational expenses: spent_on, category, amount, paid_from_cash.", 36, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("delivery_zones", 22, false, true, true),
            createDataCell("id (TEXT)", 16, false, true),
            createDataCell("branch_id -> branches", 26, false, true),
            createDataCell("Delivery logistics: zone name, fee, minimum order value, pincodes array.", 36),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("audit_logs", 22, true, true, true),
            createDataCell("id (TEXT)", 16, true, true),
            createDataCell("branch_id, user_id", 26, true, true),
            createDataCell("Immutable security log: action, entity type, record ID, metadata diff, IP address.", 36, true),
          ],
        }),
      ],
    }),

    // SECTION 7: MASTER API DIRECTORY
    h1("7. Master REST API Directory (142 Next.js App Router Routes)"),
    p(
      "Every API route in RestroFlow is built inside Next.js 16 App Router under `/app/api/v1/*`. Below is the complete catalog:"
    ),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createHeaderCell("Domain Route", 32),
            createHeaderCell("Verbs", 14),
            createHeaderCell("Operational Action & Payload", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/login", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Authenticates user email + password; sets secure session cookie.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/logout", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Terminates session and clears HTTP-only authentication cookies.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/me", 32, false, true),
            createDataCell("GET", 14, false, true),
            createDataCell("Returns current authenticated user identity and permission list.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/pin-switch", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Quick-switches identity on shared terminal using 4-digit PIN.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/register", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Provisions account; enforces Owner allow_public_signup security check.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/auth/setup-status", 32, true, true),
            createDataCell("GET", 14, true, true),
            createDataCell("Returns system onboarding state and public signup permission status.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders", 32, false, true),
            createDataCell("GET, POST", 14, false, true),
            createDataCell("Fetches active open orders or creates a new order with items and KOT round 1.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]", 32, true, true),
            createDataCell("GET, PATCH", 14, true, true),
            createDataCell("Retrieves full order with items and payments; PATCH modifies table or notes.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/items", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Appends items to an open order and automatically fires next-round KOT.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/items/[itemId]", 32, true, true),
            createDataCell("PATCH", 14, true, true),
            createDataCell("Adjusts item quantity and recalculates line total and order tax.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/items/[itemId]/remove", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Voids item from order with reason; updates kitchen tickets and recalculates totals.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/checkout", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Executes multi-tender settlement, closes check, and frees dining table.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/cancel", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Cancels entire order with reason, cancels KOTs, and releases table.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/merge", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Merges a source order into target order and updates consolidated totals.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/print/usb", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Sends ESC/POS print job to thermal printer and optionally kicks cash drawer.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/orders/[id]/print/kot", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Prints kitchen order tickets (KOT); supports reprint increment stamp.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/kds/tickets", 32, false, true),
            createDataCell("GET", 14, false, true),
            createDataCell("Streams active kitchen tickets filtered by branch and optional station ID.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/kds/tickets/[id]/status", 32, true, true),
            createDataCell("PATCH", 14, true, true),
            createDataCell("Transitions KOT status: NEW -> ACCEPTED -> PREPARING -> READY -> SERVED.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/kds/tickets/[id]/priority", 32, false, true),
            createDataCell("PATCH", 14, false, true),
            createDataCell("Toggles Rush / Priority flag on kitchen ticket.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/tables", 32, true, true),
            createDataCell("GET, POST", 14, true, true),
            createDataCell("Fetches floor tables or provisions a new dining table.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/tables/bulk", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Generates numbered tables in bulk across a specified floor section.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/tables/requests", 32, true, true),
            createDataCell("GET, POST", 14, true, true),
            createDataCell("Retrieves active waiter calls and bill requests from table QR scans.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/waitlist", 32, false, true),
            createDataCell("GET, POST", 14, false, true),
            createDataCell("Manages walk-in guest waitlist entries.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/waitlist/[id]/seat", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Seats waitlist guest at specified table and transitions table to OCCUPIED.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/accounting/closing", 32, false, true),
            createDataCell("GET, POST", 14, false, true),
            createDataCell("Fetches past register closings or performs shift cash balancing reconciliation.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/accounting/profit-loss", 32, true, true),
            createDataCell("GET", 14, true, true),
            createDataCell("Generates P&L financial statement: sales, tax, food costs, and net margins.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/accounting/gst", 32, false, true),
            createDataCell("GET", 14, false, true),
            createDataCell("Aggregates tax compliance breakdown by rate percentage (5%, 12%, 18%).", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/attendance/clock-in", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Records staff shift arrival time.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/attendance/clock-out", 32, false, true),
            createDataCell("POST", 14, false, true),
            createDataCell("Records staff shift departure time and computes total duration.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/inventory/waste", 32, true, true),
            createDataCell("GET, POST", 14, true, true),
            createDataCell("Logs spoiled or dropped ingredients with financial loss valuation.", 54, true),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/public/menu/[qrToken]", 32, false, true),
            createDataCell("GET", 14, false, true),
            createDataCell("Unauthenticated guest endpoint: returns active menu for scanned table.", 54),
          ],
        }),
        new TableRow({
          children: [
            createDataCell("/api/v1/public/kiosk/[token]/order", 32, true, true),
            createDataCell("POST", 14, true, true),
            createDataCell("Dispatches self-service touchscreen kiosk order into kitchen workflow.", 54, true),
          ],
        }),
      ],
    }),

    // SECTION 8: CLOUD DEPLOYMENT MANUAL
    h1("8. Cloud Production Deployment Manual"),
    p(
      "Deploying RestroFlow to enterprise production is straightforward because all state is maintained in Supabase PostgreSQL:"
    ),
    codeBlock([
      "Step 1: Provision Supabase PostgreSQL Database                                                       ",
      "  - Create project at https://supabase.com                                                            ",
      "  - In SQL Editor, execute `supabase/migrations/20261104000000_initial_schema.sql`                     ",
      "  - In SQL Editor, execute `supabase/seed.sql`                                                         ",
      "  - Under Storage, create public bucket `restaurant-assets`                                           ",
      "                                                                                                       ",
      "Step 2: Deploy Next.js Web App to Vercel                                                              ",
      "  - Import GitHub repository into Vercel Dashboard                                                     ",
      "  - Configure Environment Variables:                                                                   ",
      "      NEXT_PUBLIC_SUPABASE_URL      = https://<project-ref>.supabase.co                              ",
      "      NEXT_PUBLIC_SUPABASE_ANON_KEY  = <anon-public-key>                                              ",
      "      SUPABASE_SERVICE_ROLE_KEY     = <service-role-secret-key>                                      ",
      "      NEXT_PUBLIC_APP_URL           = https://your-pos-domain.com                                    ",
      "  - Click Deploy. Vercel automatically runs `next build` compiling all 142 routes.                     ",
      "                                                                                                       ",
      "Step 3: Verification                                                                                  ",
      "  - Open https://your-pos-domain.com/login                                                             ",
      "  - Sign in with Owner credentials: owner@demo.local / RestroFlow@123                                   ",
      "  - Test 4-digit PIN Quick-Switch (PIN: 1111)                                                          ",
    ]),

    // SECTION 9: AUTHORSHIP & EPILOGUE
    h1("9. System Authorship & Engineering Credits"),
    createCallout(
      "Created by ayubshaik01:",
      "RestroFlow was conceived, architected, and built by ayubshaik01 (Lead Architect & Maker). Every component, schema definition, and calculation engine in this project represents an uncompromising commitment to performance, reliability, and modern software engineering for the global restaurant industry."
    ),
    p(
      "This document serves as the complete technical specification and operational blueprint for RestroFlow v2.4.0. For technical support, custom enterprise rollouts, or multi-location implementations, please contact ayubshaik01 or consult the official project documentation."
    ),
  ];

  const doc = new Document({
    creator: "ayubshaik01",
    title: "RestroFlow Master Engineering & Operational Architecture",
    description: "Master Architecture, Full Feature Specifications, Complete Database Blueprint & Operations Guide by ayubshaik01",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 900, left: 1100, right: 1100 },
          },
        },
        children: elements,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const primaryPath = path.join(process.cwd(), "RESTROFLOW-PROJECT-GUIDE.docx");
  const fallbackPath = path.join(process.cwd(), "RESTROFLOW-MASTER-GUIDE.docx");
  const mirrorPath = path.join(process.cwd(), "ORDERRESTRO-PROJECT-GUIDE.docx");

  try {
    fs.writeFileSync(primaryPath, buffer);
    console.log(`Generated ${primaryPath} (${buffer.length} bytes)`);
  } catch (err) {
    if (err.code === "EBUSY") {
      console.warn(`Notice: ${primaryPath} is currently open in Microsoft Word. Writing to ${fallbackPath}`);
      fs.writeFileSync(fallbackPath, buffer);
      console.log(`Generated ${fallbackPath} (${buffer.length} bytes)`);
    } else {
      throw err;
    }
  }

  try {
    fs.writeFileSync(mirrorPath, buffer);
    console.log(`Generated ${mirrorPath} (${buffer.length} bytes)`);
  } catch (err) {
    console.warn(`Could not write mirror path: ${err.message}`);
  }
}

buildMasterDocument().catch((err) => {
  console.error(err);
  process.exit(1);
});
