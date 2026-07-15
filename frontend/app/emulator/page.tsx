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

const inputClasses =
  "rounded-lg border border-secondary/50 bg-secondary/50 px-3.5 py-2.5 text-text placeholder:text-text-secondary/50 transition-all duration-300 hover:border-secondary/700 focus:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500";

export default function EmulatorPage() {
  const [cardholderName, setCardholderName] = useState("");
  const [amount, setAmount] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
        setToast({ message: "Transaction submitted successfully!", type: "success" });
        // Reset form after success
        setCardholderName("");
        setAmount("");
        setIpAddress("");
        setCountryCode("");
      } else {
        setSubmitState({ status: "error", message: result.error });
        setToast({ message: `Error: ${result.error}`, type: "error" });
      }
    } catch (err) {
      if (err instanceof ApiConfigError) {
        setSubmitState({ status: "error", message: err.message });
        setToast({ message: err.message, type: "error" });
      } else {
        setSubmitState({
          status: "error",
          message: err instanceof Error ? err.message : "Something went wrong",
        });
        setToast({
          message: err instanceof Error ? err.message : "Something went wrong",
          type: "error",
        });
      }
    }
  }

  const handleToastClose = () => {
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] pb-16">
      <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
        <section className="rounded-2xl border border-secondary/50 bg-secondary/50 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text animate-fade-in-up-0">
            Transaction Emulator
          </h1>
          <p className="mt-2 max-w-md text-sm text-text-secondary/80 animate-fade-in-up-1">
            Send a synthetic transaction through the real ingestion pipeline.
            The dial on the right previews where the heuristic scorer will
            likely land — the Lambda decides the final score.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5 max-w-md animate-fade-in-up-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cardholder_name"
                className="font-mono text-xs text-text-secondary/70"
              >
                Cardholder name
              </label>
              <input
                id="cardholder_name"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="Ama Owusu"
                className={inputClasses}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="amount" className="font-mono text-xs text-text-secondary/70">
                Amount (USD)
              </label>
              <input
                id="amount"
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="250.00"
                className={`${inputClasses} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="ip_address" className="font-mono text-xs text-text-secondary/70">
                IP address
              </label>
              <input
                id="ip_address"
                required
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="102.176.65.12"
                className={`${inputClasses} font-mono`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="country_code" className="font-mono text-xs text-text-secondary/70">
                Country code (ISO 2-letter)
              </label>
              <input
                id="country_code"
                required
                maxLength={2}
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                placeholder="GH"
                className={`w-24 uppercase ${inputClasses} font-mono`}
              />
            </div>

            <button
              type="submit"
              disabled={submitState.status === "submitting"}
              className="mt-2 w-fit rounded-lg bg-accent px-4 py-2.5 font-mono text-sm font-medium text-text shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 relative overflow-enhanced"
            >
              <span className="relative z-10 inline-flex items-center">
                {submitState.status === "submitting" ? (
                  <>
                    Sending…
                    <span className="ml-2 h-4 w-4 animate-pulse rounded-full bg-text"></span>
                  </>
                ) : (
                  "Send transaction"
                )}
              </span>
            </button>

            {submitState.status === "success" && (
              <div
                className="mt-4 rounded-lg border border-success/20 bg-success/10 px-3.5 py-2.5 text-sm text-success animate-fade-in-up-3"
                role="status"
              >
                Sent. It&apos;s queued for evaluation — check the Monitoring Feed
                once a read endpoint is connected.
              </div>
            )}
            {submitState.status === "error" && (
              <div
                className="mt-4 rounded-lg border border-danger/20 bg-danger/10 px-3.5 py-2.5 text-sm text-danger animate-fade-in-up-3"
                role="alert"
              >
                {submitState.message}
              </div>
            )}
          </form>
        </section>

        <aside className="flex flex-col items-center gap-4 lg:pt-16">
          <div className="relative">
            <RiskMeter score={liveScore} />
            {/* Animated particles for high score */}
            {liveScore >= 75 && (
              <div className="absolute inset-0 pointer-effects-none">
                <div className="absolute inset-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        left: `${Math.sin(i * 0.5 + Date.now() * 0.001) * 30 + 50}%`,
                        top: `${Math.cos(i * 0.3 + Date.now() * 0.0015) * 25 + 50}%`,
                        width: "2px",
                        height: "2px",
                        backgroundColor: "#22C55E",
                        borderRadius: "50%",
                        opacity: "0.3",
                        pointerEvents: "none",
                        animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
                      }}
                      aria-hidden="true"
                    >
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="max-w-[14rem] text-center font-mono text-xs text-text-secondary/70">
            Live preview, client-side only
          </p>
        </aside>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 max-w-xs rounded-lg border border-${toast.type === "success" ? "success/30" : "danger/30"} bg-${toast.type === "success" ? "success/10" : "danger/10"} px-4 py-3 text-sm font-mono text-${toast.type === "success" ? "success" : "danger"} animate-fade-in-up z-50`}
          onClick={handleToastClose}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}