"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PosMockup } from "@/components/marketing/pos-mockup";

const words = ["The", "restaurant", "OS", "that", "flows", "at", "lightning", "speed."];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-20 pb-24 sm:px-6 sm:pt-28">
      {/* Ambient gradient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[580px] bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary),transparent_86%),transparent)]"
      />

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-xs font-semibold text-rose-500"
        >
          <Sparkles className="size-3.5 animate-pulse text-amber-500" />
          <span>RestroFlow 2.0 · Next.js & Supabase Realtime Engine</span>
        </motion.div>

        <h1 className="flex flex-wrap justify-center gap-x-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl">
          {words.map((word, i) => (
            <motion.span
              key={word}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className={
                word === "flows" || word === "speed."
                  ? "bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 bg-clip-text text-transparent"
                  : undefined
              }
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl"
        >
          High-performance dine-in POS, live kitchen displays, drag-and-drop table management,
          QR order-at-table, customer loyalty, and real-time inventory — unified in one
          supercharged cloud platform.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <Button size="lg" className="h-12 px-7 text-base font-semibold shadow-lg shadow-rose-500/20" render={<Link href="/signup" />}>
            Launch RestroFlow Free
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-6 text-base font-medium"
            render={<Link href="/login" />}
          >
            Staff & Manager Login
          </Button>
        </motion.div>
      </div>

      <div className="mt-16 sm:mt-20">
        <PosMockup />
      </div>
    </section>
  );
}
