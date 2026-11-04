import { LifeBuoy } from "lucide-react";
import { RestroFlowLogo } from "./restroflow-logo";

export function BrandFooter() {
  return (
    <div className="flex flex-col gap-2 border-t border-sidebar-border px-4 py-3">
      <a
        href="https://github.com/supabase/supabase"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-lg border border-sidebar-border px-3 py-1.5 text-xs font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        Support & Docs
      </a>
      <div className="flex items-center justify-between pt-1">
        <RestroFlowLogo size={20} showText showBadge={false} />
        <span className="text-[10px] text-muted-foreground">v2.0 Cloud</span>
      </div>
    </div>
  );
}
