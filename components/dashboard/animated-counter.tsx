"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";

/**
 * Animated number counter that smoothly transitions between values.
 * Uses spring physics for organic feel.
 */
export function AnimatedCounter({
  value,
  formatFn,
  className,
}: {
  value: number;
  formatFn?: (v: number) => string;
  className?: string;
}) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) =>
    formatFn ? formatFn(Math.round(v)) : Math.round(v).toLocaleString("en-IN"),
  );
  const ref = useRef<HTMLSpanElement>(null);
  const [text, setText] = useState(formatFn ? formatFn(0) : "0");

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = display.on("change", (v) => {
      setText(v);
    });
    return unsub;
  }, [display]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}

