"use client";

import { useEffect, useRef } from "react";
import { riskLevelFor } from "@/lib/types";

interface RiskMeterProps {
  score: number; // 0-100, live-computed client-side preview (not the
  // authoritative score — that's decided server-side by fraud_evaluator.py.
  // This is a heads-up preview so the operator sees risk building as they
  // type, not a claim about the final verdict.
}

// Matches the Tailwind emerald-400 / amber-400 / red-400 hex values used
// in the status pill treatment elsewhere (bg-{color}-500/10, text-{color}-400,
// border-{color}-500/20), so the dial and the badges read as one system.
const LEVEL_COLOR: Record<string, string> = {
  low: "#34d399",   // emerald-400
  watch: "#fbbf24",  // amber-400
  high: "#f87171",   // red-400
};

const LEVEL_PILL: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  watch: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

const LEVEL_LABEL: Record<string, string> = {
  low: "Low signal",
  watch: "Elevated — watch",
  high: "High risk",
};

/**
 * The signature moment of the Transaction Emulator: a radar-sweep dial
 * that fills and reddens live as the operator fills in the form,
 * previewing where the heuristic scorer will likely land. The sweep
 * hand keeps turning as ambient "the system is always watching" texture;
 * it pauses when prefers-reduced-motion is set.
 */
export default function RiskMeter({ score }: RiskMeterProps) {
  const level = riskLevelFor(score);
  const color = LEVEL_COLOR[level];
  const label = LEVEL_LABEL[level];

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const pulseRef = useRef<HTMLDivElement | null>(null);

  // Enhanced animation for high scores
  useEffect(() => {
    if (score >= 75) {
      // Trigger pulse animation for high risk scores
      if (pulseRef.current) {
        pulseRef.current.style.animation = "pulseRing 1.6s ease-out infinite";
      }
    } else {
      if (pulseRef.current) {
        pulseRef.current.style.animation = "none";
      }
    }
  }, [score]);

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl border border-secondary/50 bg-secondary/50 p-8 transition-all duration-300 hover:border-accent/50 hover:bg-accent/5"
      role="img"
      aria-label={`Live risk preview: ${score} out of 100, ${label}`}
    >
      <div className="relative h-48 w-48">
        {/* Base circle */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
        />

        {/* Outer glow effect for high scores */}
        {score >= 50 && (
          <circle
            cx="100"
            cy="100"
            r={radius + 5}
            fill="none"
            stroke={color}
            strokeWidth="2"
            opacity={score >= 75 ? 0.3 : 0.15}
            className="transition-all duration-300"
          />
        )}

        {/* Rotating sweep hand — ambient texture, respects reduced-motion */}
        <div
          className="absolute inset-0 motion-safe:animate-sweep motion-reduce:animate-none"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(99,102,241,0.16), transparent 20%)",
            borderRadius: "9999px",
          }}
          aria-hidden="true"
        >

          <svg
            viewBox="0 0 200 200"
            className="relative h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#27272a"
              strokeWidth="10"
            />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 300ms ease, stroke 300ms ease" }}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="font-mono text-4xl font-semibold text-text transition-all duration-300"
            >
              {Math.round(score)}
            </span>
            <span
              className="font-mono text-xs text-text-secondary/70"
            >
              / 100
            </span>
          </div>

          {/* Enhanced pulse effect for high scores */}
          {score >= 50 && (
            <div
              ref={pulseRef}
              className={`absolute inset-0 rounded-full ${score >= 75 ? "motion-safe:animate-pulse-ring" : ""}`}
              style={{
                border: `${score >= 75 ? "3px" : "2px"} solid ${color}`,
                opacity: score >= 75 ? 0.6 : 0.3
              }}
              aria-hidden="true"
            />
          )}

          {/* Ambient particle effects */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Floating particles */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${Math.sin(i * 0.5 + Date.now() * 0.001) * 30 + 50}%`,
                  top: `${Math.cos(i * 0.3 + Date.now() * 0.0015) * 25 + 50}%`,
                  width: "2px",
                  height: "2px",
                  backgroundColor: color,
                  borderRadius: "50%",
                  opacity: "0.3",
                  pointerEvents: "none",
                  animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 font-mono text-xs tracking-wide ${LEVEL_PILL[level]} transition-all duration-300 hover:${LEVEL_PILL[level].replace('/20', '/30').replace('/10', '/20')}`}
        >
          {label.toUpperCase()}
        </span>
      </div>
    </div>
  );
}