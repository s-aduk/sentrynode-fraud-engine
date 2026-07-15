"use client";

import { useEffect, useState } from "react";
import { fetchAuditFeed } from "@/lib/api";
import { riskLevelFor, type AuditRecord } from "@/lib/types";

type FeedState =
  | { status: "loading" }
  | { status: "not_connected" }
  | { status: "error"; detail?: string }
  | { status: "ready"; records: AuditRecord[] };

// Soft, transparent status pills — reserved strictly for actual risk
// state, matching the treatment used on the Emulator's risk dial.
const LEVEL_PILL: Record<string, string> = {
  low: "bg-success/10 text-success/20",
  watch: "bg-warning/10 text-warning border-warning/20",
  high: "bg-danger/10 text-danger border-danger/20",
};

const LEVEL_LABEL: Record<string, string> = {
  low: "Low",
  watch: "Watch",
  high: "High",
};

export default function MonitoringPage() {
  const [state, setState] = useState<FeedState>({ status: "loading" });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      const result = await fetchAuditFeed();
      if (cancelled) return;
      if (!result.ok) {
        setState(
          result.reason === "not_connected"
            ? { status: "not_connected" }
            : { status: "error", detail: result.detail }
        );
      } else {
        setState({ status: "ready", records: result.records });
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] pb-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-text mb-4 animate-fade-in-down">
        Monitoring Feed
      </h1>
      <p className="mt-2 max-w-lg text-sm text-text-secondary/80 animate-fade-in-down">
        Every transaction the evaluator has scored, most recent first.
        High-risk rows are pulled forward visually — they are the ones that
        need a human look.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary/50 bg-secondary/50 p-10 text-center animate-fade-in-up">
            <div className="animate-pulse rounded-full bg-accent/20 w-8 h-8 mb-2"></div>
            <p className="font-mono text-sm text-text-secondary/70">Loading feed…</p>
          </div>
        )}

        {state.status === "not_connected" && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-secondary/50 bg-secondary/50 p-10 text-center animate-fade-in-up">
            <div className="flex items-center gap-2">
              <div className="animate-pulse rounded-full bg-warning/20 w-2 h-2"></div>
              <p className="font-mono text-sm text-text-secondary">Not connected</p>
            </div>
            <p className="max-w-sm text-sm text-text-secondary/70">
              Phase 1 doesn&apos;t ship a read API for the audit table — this
              is a deliberate scope cut, not a bug. Set{" "}
              <code className="rounded bg-secondary/50 px-1 py-0.5 text-xs text-text-secondary/50">
                NEXT_PUBLIC_MONITORING_API_URL
              </code>{" "}
              once a read endpoint exists. See docs/architecture.md.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs text-accent hover:bg-accent/20 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              Refresh
            </button>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 p-10 text-center animate-fade-in-up">
            <p className="font-mono text-sm text-danger">Could not load the feed</p>
            {state.detail && (
              <p className="text-sm text-text-secondary/70">{state.detail}</p>
            )}
            <button
              onClick={handleRefresh}
              className="mt-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-xs text-accent hover:bg-accent/20 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              Retry
            </button>
          </div>
        )}

        {state.status === "ready" && state.records.length === 0 && (
          <div className="rounded-2xl border border-secondary/50 bg-secondary/50 p-10 text-center font-mono text-sm text-text-secondary/70 animate-fade-in-up">
            No transactions logged yet.
            <button
              onClick={handleRefresh}
              className="mt-4 inline-flex items-center px-3 py-2 text-sm font-medium transition-colors duration-200 bg-accent/10 hover:bg-accent/20 text-accent rounded-lg"
            >
              Try sending a transaction
            </button>
          </div>
        )}

        {state.status === "ready" &&
          state.records.map((record, index) => {
            const level = riskLevelFor(record.risk_score);
            const isHighRisk = level === "high";

            return (
              <div
                key={record.transaction_id}
                className={`flex flex-col gap-3 rounded-2xl border p-6 transition-all duration-300 sm:flex-row sm:items-center sm:justify-between ${
                  isHighRisk
                    ? "border-danger/20 bg-danger/5 hover:border-danger/30 hover:bg-danger/10"
                    : "border-secondary/50 bg-secondary/50 hover:border-secondary/700 hover:bg-secondary/60"
                } animate-fade-up-${index % 9}`}
              >
                <div className="flex flex-col gap-1">
                  <p className="font-medium text-text hover:text-text/90 transition-colors duration-200">
                    {record.cardholder_name}
                  </p>
                  <p className="font-mono text-xs text-text-secondary/60 hover:text-text-secondary/50 transition-colors duration-200">
                    {record.country_code} · {record.ip_address}
                  </p>
                  {record.reasons.length > 0 && (
                    <p className="text-xs text-text-secondary/50 hover:text-text-secondary/40 transition-colors duration-200">
                      {record.reasons.join("; ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-text-secondary hover:text-text-secondary/30 transition-colors duration-200">
                    ${record.amount}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 font-mono text-xs tracking-wide ${LEVEL_PILL[level]} transition-all duration-300 hover:${LEVEL_PILL[level].replace('/20', '/30').replace('/10', '/20')}`}
                  >
                    {record.risk_score} / 100
                  </span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}