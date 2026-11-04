import Link from "next/link";
import { RestroFlowLogo } from "@/components/layout/restroflow-logo";
import { Button } from "@/components/ui/button";

export function ClaimedLanding() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
      <RestroFlowLogo size={56} />
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
        Restro<span className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent font-extrabold">Flow</span>
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Your restaurant cloud instance is live and running. Sign in to your staff or admin dashboard to begin.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Button size="lg" className="font-medium" render={<Link href="/login" />}>
          Sign in to POS
        </Button>
        <Button variant="outline" size="lg" render={<Link href="/docs" />}>
          View documentation
        </Button>
      </div>
    </div>
  );
}
