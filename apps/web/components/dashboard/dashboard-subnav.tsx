"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  ShoppingCart,
  UtensilsCrossed,
  LayoutGrid,
  ChefHat,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Order / POS", href: "/pos", icon: ShoppingCart },
  { label: "Menu", href: "/menu", icon: UtensilsCrossed },
  { label: "Tables", href: "/tables", icon: LayoutGrid },
  { label: "Kitchen", href: "/kds", icon: ChefHat },
  { label: "Analytics", href: "/reports", icon: BarChart3 },
];

export function DashboardSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto rounded-full border border-border/80 bg-card/80 p-1.5 shadow-2xs backdrop-blur-md scrollbar-none">
      {NAV_TABS.map((tab) => {
        const isActive = pathname === tab.href || (tab.href !== "/dashboard" && pathname?.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors",
              isActive
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

