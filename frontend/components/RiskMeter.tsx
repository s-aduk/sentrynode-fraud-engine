"use client";

import { riskLevelFor } from "@/lib/types";

interface RiskMeterProps {
  score: number; // 0-100, live-computed client-side preview (not the
  // authoritative score — that's decided server-side by fraud_evaluator.py.
  // This is a heads-up preview so the operator sees risk building as they
  // type, not a claim about the final verdict.
}

const LEVEL_COLOR: Record<string, string> = {
  low: "#3DDC97",
  watch: "#F5A623",
  high: "#FF4F5E",
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

  return (
    <div
      className="flex flex-col items-center gap-3"
      role="img"
      aria-label={`Live risk preview: ${score} out of 100, ${label}`}
    >
      <div className="relative h-48 w-48">
        {/* Rotating sweep hand — ambient texture, respects reduced-motion */}
        <div
          className="absolute inset-0 motion-safe:animate-sweep motion-reduce:animate-none"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(61,220,151,0.18), transparent 20%)",
            borderRadius: "9999px",
          }}
          aria-hidden="true"
        />

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
            stroke="#22303C"
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
          <span className="font-mono text-4xl font-semibold text-ink">
            {Math.round(score)}
          </span>
          <span className="font-mono text-xs text-mute">/ 100</span>
        </div>

        {level === "high" && (
          <span
            className="absolute inset-0 rounded-full motion-safe:animate-pulse-ring"
            style={{ border: `2px solid ${color}` }}
            aria-hidden="true"
          />
        )}
      </div>

      <span
        className="rounded-full px-3 py-1 font-mono text-xs tracking-wide"
        style={{ color, backgroundColor: `${color}1A`, border: `1px solid ${color}55` }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}
