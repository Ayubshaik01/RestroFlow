"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useRegister } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const register = useRegister();
  const prefersReducedMotion = useReducedMotion();
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [allowPublicSignup, setAllowPublicSignup] = useState<boolean>(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    fetch("/api/v1/auth/register")
      .then((res) => res.json())
      .then((data) => {
        setAllowPublicSignup(Boolean(data.allowPublicSignup));
      })
      .catch(() => {
        setAllowPublicSignup(false);
      })
      .finally(() => {
        setCheckingStatus(false);
      });
  }, []);

  const onSubmit = (dto: RegisterDto) => {
    register.mutate(dto, {
      onSuccess: () => router.push("/dashboard"),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Registration failed");
      },
    });
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_90%),transparent)]"
      />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="transition-transform hover:scale-105">
            <Logo size={52} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Restro<span className="bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent font-extrabold">Flow</span>
            </h1>
            <p className="mt-1 text-xs font-semibold tracking-wider text-rose-500 uppercase">
              The Intelligent Restaurant OS & POS
            </p>
          </div>
        </div>

        {checkingStatus ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : !allowPublicSignup ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border/80 bg-card p-6 text-center shadow-lg">
            <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <Lock className="size-7" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Registration Restricted
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Public self-registration is disabled for this restaurant system.
                New accounts can only be created by an <strong>Owner</strong> or <strong>Administrator</strong> inside the Staff Management panel.
              </p>
            </div>

            <div className="w-full border-t border-border/60 pt-4">
              <Button
                variant="default"
                size="lg"
                className="w-full font-medium"
                render={<Link href="/login" />}
              >
                Go to Sign In
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Are you the Owner? Sign in to your account and go to <strong>Settings &gt; Staff</strong> to manage team members.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Launch your restaurant in minutes
            </p>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="restaurantName">Restaurant name</Label>
                <Input
                  id="restaurantName"
                  autoComplete="organization"
                  placeholder="e.g. Amber Bistro"
                  {...field("restaurantName")}
                />
                {errors.restaurantName && (
                  <p className="text-xs text-destructive">{errors.restaurantName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="branchName">First branch name</Label>
                <Input
                  id="branchName"
                  placeholder="Main Branch"
                  defaultValue="Main Branch"
                  {...field("branchName")}
                />
                {errors.branchName && (
                  <p className="text-xs text-destructive">{errors.branchName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="ownerName">Your name</Label>
                <Input
                  id="ownerName"
                  autoComplete="name"
                  placeholder="e.g. Alex Rivera"
                  {...field("ownerName")}
                />
                {errors.ownerName && (
                  <p className="text-xs text-destructive">{errors.ownerName.message}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@restaurant.com"
                  {...field("email")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...field("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="mt-2 h-12 text-base font-semibold" disabled={register.isPending}>
                {register.isPending ? "Creating your account…" : "Create RestroFlow Account"}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </main>
  );
}
