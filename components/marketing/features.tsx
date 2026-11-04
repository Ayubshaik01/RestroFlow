import {
  ChefHat,
  Database,
  Gift,
  Package,
  Plug,
  QrCode,
  ShieldCheck,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/reveal";

const features = [
  {
    icon: UtensilsCrossed,
    title: "Dine-in POS & Billing",
    description:
      "Modifiers, combos, split & merge bills, tips, gift cards, multi-payment checkout, and tax-inclusive GST pricing done right.",
  },
  {
    icon: ChefHat,
    title: "Live Kitchen Display (KDS)",
    description:
      "KOTs auto-routed in real-time to the right kitchen station, reprint & priority controls, and per-station prep-time analytics.",
  },
  {
    icon: QrCode,
    title: "Tables & Floor Plan",
    description:
      "Interactive visual floor plan, live occupancy, reservation waitlist, table transfer, and dynamic QR codes for guest self-ordering.",
  },
  {
    icon: Package,
    title: "Inventory & Procurement",
    description:
      "Ingredients, recipe costing, automated stock deductions, purchase orders, goods receipt with batch tracking, and waste logging.",
  },
  {
    icon: Gift,
    title: "CRM & Customer Loyalty",
    description:
      "Customer profiles, visit history, loyalty point accrual and redemption, and custom gift card issuance.",
  },
  {
    icon: Zap,
    title: "Real-time Multi-terminal Flow",
    description:
      "Instantaneous sync across POS terminals, kitchen screens, waiters' phones, and self-service kiosks with Supabase Realtime.",
  },
  {
    icon: ShieldCheck,
    title: "Granular RBAC Security",
    description:
      "Role-based access controls on every action, custom employee PIN switching, and strict multi-tenant branch isolation.",
  },
  {
    icon: Database,
    title: "Supabase & Postgres Core",
    description:
      "Powered by modern PostgreSQL with Row-Level Security (RLS) — enterprise-grade reliability, automated backups, and scalability.",
  },
  {
    icon: Plug,
    title: "API & Headless Integrations",
    description:
      "Connect third-party aggregators, mobile apps, or your own customer-facing website directly to RestroFlow via REST APIs.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Everything an ambitious restaurant operation needs
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Not a generic retail tool adapted for dining — RestroFlow is purpose-built for
          high-volume restaurants, bistros, cafes, and multi-branch food chains.
        </p>
      </Reveal>

      <RevealGroup className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <RevealItem
            key={f.title}
            className="group rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-foreground">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {f.description}
            </p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
