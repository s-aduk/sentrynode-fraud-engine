"use client";

import { useMemo, useState } from "react";
import RiskMeter from "@/components/RiskMeter";
import { submitTransaction } from "@/lib/api";
import { ApiConfigError } from "@/lib/api";

// Client-side preview only — mirrors the Phase 1 heuristic weights in
// lambda/fraud_evaluator.py so the operator sees a live estimate, but the
// server-side evaluation is always the authoritative one. Kept in sync
// per CONTRIBUTING.md's shared-contract rule.
const HIGH_AMOUNT_THRESHOLD = 10000;
const HIGH_RISK_COUNTRIES = new Set(["KP", "IR", "SY", "CU"]);
const WEIGHT_AMOUNT = 60;
const WEIGHT_COUNTRY = 30;
const WEIGHT_IP = 15;

function previewScore(amount: string, countryCode: string, ip: string): number {
  let score = 0;
  const numericAmount = Number(amount);
  if (!Number.isNaN(numericAmount) && numericAmount >= HIGH_AMOUNT_THRESHOLD) {
    score += WEIGHT_AMOUNT;
  }
  if (HIGH_RISK_COUNTRIES.has(countryCode.trim().toUpperCase())) {
    score += WEIGHT_COUNTRY;
  }
  if (
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("127.")
  ) {
    score += WEIGHT_IP;
  }
  return Math.min(score, 100);
}

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export default function EmulatorPage() {
  const [cardholderName, setCardholderName] = useState("");
  const [amount, setAmount] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const liveScore = useMemo(
    () => previewScore(amount, countryCode, ipAddress),
    [amount, countryCode, ipAddress]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitState({ status: "submitting" });

    try {
      const result = await submitTransaction({
        cardholder_name: cardholderName,
        amount,
        ip_address: ipAddress,
        country_code: countryCode,
      });

      if (result.ok) {
        setSubmitState({ status: "success" });
      } else {
        setSubmitState({ status: "error", message: result.error });
      }
    } catch (err) {
      if (err instanceof ApiConfigError) {
        setSubmitState({ status: "error", message: err.message });
      } else {
        setSubmitState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
      <section>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Transaction Emulator
        </h1>
        <p className="mt-2 max-w-md text-sm text-mute">
          Send a synthetic transaction through the real ingestion pipeline.
          The dial on the right previews where the heuristic scorer will
          likely land — the Lambda decides the final score.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 max-w-md">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cardholder_name" className="font-mono text-xs text-mute">
              Cardholder name
            </label>
            <input
              id="cardholder_name"
              required
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Ama Owusu"
              className="rounded-md border border-line bg-panel px-3 py-2 text-ink placeholder:text-mute/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="amount" className="font-mono text-xs text-mute">
              Amount (USD)
            </label>
            <input
              id="amount"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250.00"
              className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-ink placeholder:text-mute/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ip_address" className="font-mono text-xs text-mute">
              IP address
            </label>
            <input
              id="ip_address"
              required
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="102.176.65.12"
              className="rounded-md border border-line bg-panel px-3 py-2 font-mono text-ink placeholder:text-mute/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="country_code" className="font-mono text-xs text-mute">
              Country code (ISO 2-letter)
            </label>
            <input
              id="country_code"
              required
              maxLength={2}
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
              placeholder="GH"
              className="w-24 rounded-md border border-line bg-panel px-3 py-2 font-mono uppercase text-ink placeholder:text-mute/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
            />
          </div>

          <button
            type="submit"
            disabled={submitState.status === "submitting"}
            className="mt-2 w-fit rounded-md bg-signal px-4 py-2 font-mono text-sm font-medium text-base transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            {submitState.status === "submitting" ? "Sending…" : "Send transaction"}
          </button>

          {submitState.status === "success" && (
            <p className="rounded-md border border-signal/40 bg-signal/10 px-3 py-2 text-sm text-signal" role="status">
              Sent. It&apos;s queued for evaluation — check the Monitoring Feed
              once a read endpoint is connected.
            </p>
          )}
          {submitState.status === "error" && (
            <p className="rounded-md border border-alert/40 bg-alert/10 px-3 py-2 text-sm text-alert" role="alert">
              {submitState.message}
            </p>
          )}
        </form>
      </section>

      <aside className="flex flex-col items-center gap-4 lg:pt-16">
        <RiskMeter score={liveScore} />
        <p className="max-w-[14rem] text-center font-mono text-xs text-mute">
          Live preview, client-side only
        </p>
      </aside>
    </div>
  );
}
