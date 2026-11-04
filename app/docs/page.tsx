import type { Metadata } from "next";
import Link from "next/link";
import { DocPage, DocSection } from "@/components/marketing/doc-page";
import { downloadHref } from "@/lib/downloads";

export const metadata: Metadata = {
  title: "Documentation — RestroFlow",
  description: "API & Supabase integrations, accessibility, and compliance docs for RestroFlow.",
};

const docs = [
  {
    href: "/docs/user-guide",
    title: "User Guide & Operations Manual",
    description: "Complete guide for staff roles, Owner security controls, POS billing, KDS routing, and table service.",
  },
  {
    href: "/docs/api",
    title: "API & Integrations",
    description: "Connect an external app, AI client, or use RestroFlow as a backend for your own website.",
  },
  {
    href: "/docs/accessibility",
    title: "Accessibility",
    description: "How RestroFlow is engineered to work seamlessly with keyboards, screen readers, and high contrast.",
  },
  {
    href: "/docs/compliance-india",
    title: "GST & Invoicing Compliance",
    description: "GST tax breakdown, receipts, and compliance notes for running RestroFlow.",
  },
];

export default function DocsIndexPage() {
  return (
    <DocPage title="Documentation" updated="2026">
      <DocSection heading="Guides">
        <div className="flex flex-col divide-y divide-border/60 rounded-xl border border-border/60">
          {docs.map((doc) => (
            <Link
              key={doc.href}
              href={doc.href}
              className="flex flex-col gap-1 p-4 transition-colors hover:bg-secondary"
            >
              <span className="text-sm font-medium text-foreground">{doc.title}</span>
              <span className="text-sm text-muted-foreground">{doc.description}</span>
            </Link>
          ))}
        </div>
      </DocSection>

      <DocSection heading="Supabase & Architecture Reference">
        <p>
          Full database schema, Row-Level Security (RLS) setup, and realtime engine configuration are documented in the root{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SUPABASE_SETUP.md</code> file.
        </p>
      </DocSection>
    </DocPage>
  );
}
