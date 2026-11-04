import Link from "next/link";
import { RestroFlowLogo } from "@/components/layout/restroflow-logo";
import { downloadHref } from "@/lib/downloads";

const columns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Features" },
      { href: "#security", label: "Security & Cloud" },
      { href: "#get-started", label: "Get started" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: downloadHref("github"), label: "GitHub" },
      { href: "/docs/api", label: "API & Supabase Integrations" },
      { href: "/docs/accessibility", label: "Accessibility statement" },
      { href: "/docs/compliance-india", label: "Compliance & GST Notes" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/60 px-4 py-14 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <RestroFlowLogo size={32} showText showBadge badgeText="CLOUD" />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
              The intelligent cloud restaurant operating system and POS. Powered by Next.js and Supabase for instantaneous multi-terminal flow.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {col.title}
              </h3>
              <ul className="mt-3 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} RestroFlow. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">The Modern Restaurant Operating System.</p>
        </div>
      </div>
    </footer>
  );
}
