"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginDto } from "@nodedr-restaurant/types";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useLogin } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  // Set once the server says this account uses two-factor authentication.
  const [needsCode, setNeedsCode] = useState(false);
  // Shown inline under the form (a toast vanishes before it can be read).
  const [error, setError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(loginSchema) });

  const fillAndLogin = (email: string, pass: string) => {
    setValue("email", email);
    setValue("password", pass);
    onSubmit({ email, password: pass });
  };

  const onSubmit = (dto: LoginDto) => {
    setError(null);
    login.mutate(dto, {
      onSuccess: () => router.push("/dashboard"),
      onError: (err) => {
        if (err instanceof ApiError && err.message === "TWO_FACTOR_REQUIRED") {
          setNeedsCode(true);
          return;
        }
        if (err instanceof ApiError && err.status >= 500) {
          setError("The server is having a problem right now. Please try again in a minute.");
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError("Can't reach the server. Check your internet connection and try again.");
        }
      },
    });
  };

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-4">
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
          <p className="text-sm text-muted-foreground">Sign in to manage your restaurant</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              autoFocus
              className="h-11"
              placeholder="you@restaurant.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              enterKeyHint="go"
              className="h-11"
              placeholder="Your password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {needsCode && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="totp">Verification code</Label>
              <Input
                id="totp"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                placeholder="6-digit code or recovery code"
                {...register("totp")}
              />
              <p className="text-xs text-muted-foreground">
                Open your authenticator app, or use one of your recovery codes.
              </p>
              {errors.totp && <p className="text-xs text-destructive">{errors.totp.message}</p>}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="mt-2 h-12 text-base font-semibold" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in to RestroFlow"}
          </Button>

          <div className="relative my-2 text-center text-xs text-muted-foreground after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or quick test accounts
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 border-orange-500/30 bg-orange-500/5 hover:bg-orange-500/15 text-xs font-medium justify-between px-3"
              onClick={() => fillAndLogin("owner@demo.local", "RestroFlow@123")}
              disabled={login.isPending}
            >
              <span className="flex items-center gap-1.5 font-semibold text-orange-600 dark:text-orange-400">
                👑 Demo Owner
              </span>
              <span className="text-[11px] text-muted-foreground font-mono">owner@demo.local</span>
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs justify-between px-2.5"
                onClick={() => fillAndLogin("manager@demo.local", "RestroFlow@123")}
                disabled={login.isPending}
              >
                <span className="font-medium">📋 Manager</span>
                <span className="text-[10px] text-muted-foreground">manager@</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs justify-between px-2.5"
                onClick={() => fillAndLogin("cashier@demo.local", "RestroFlow@123")}
                disabled={login.isPending}
              >
                <span className="font-medium">💳 Cashier</span>
                <span className="text-[10px] text-muted-foreground">cashier@</span>
              </Button>
            </div>
          </div>
        </form>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Need a staff account?{" "}
          <span className="font-medium text-foreground">
            Contact your restaurant Owner / Admin
          </span>
        </p>
      </motion.div>
    </main>
  );
}
