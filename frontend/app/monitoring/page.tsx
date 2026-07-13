"use client";

import { useEffect, useState } from "react";
import { fetchAuditFeed } from "@/lib/api";
import { riskLevelFor, type AuditRecord } from "@/lib/types";

type FeedState =
  | { status: "loading" }
  | { status: "not_connected" }
  | { status: "error"; detail?: string }
  | { status: "ready"; records: AuditRecord[] };

const LEVEL_STYLES: Record<string, string> = {
  low: "text-signal border-signal/30 bg-signal/5",
  watch: "text-watch border-watch/30 bg-watch/5",
  high: "text-alert border-alert/40 bg-alert/10",
};

export default function MonitoringPage() {
  const [state, setState] = useState<FeedState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchAuditFeed().then((result) => {
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
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Monitoring Feed
      </h1>
      <p className="mt-2 max-w-lg text-sm text-mute">
        Every transaction the evaluator has scored, most recent first.
        High-risk rows are pulled forward visually — they are the ones that
        need a human look.
      </p>

      <div className="mt-6 overflow-hidden rounded-lg border border-line">
        {state.status === "loading" && (
          <div className="p-8 text-center font-mono text-sm text-mute">
            Loading feed…
          </div>
        )}

        {state.status === "not_connected" && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <span
              className="inline-block h-2 w-2 rounded-full bg-watch"
              aria-hidden="true"
            />
            <p className="font-mono text-sm text-ink">Not connected</p>
            <p className="max-w-sm text-sm text-mute">
              Phase 1 doesn&apos;t ship a read API for the audit table — this
              is a deliberate scope cut, not a bug. Set{" "}
              <code className="rounded bg-panel px-1 py-0.5 text-xs">
                NEXT_PUBLIC_MONITORING_API_URL
              </code>{" "}
              once a read endpoint exists. See docs/architecture.md.
            </p>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <p className="font-mono text-sm text-alert">Could not load the feed</p>
            {state.detail && <p className="text-sm text-mute">{state.detail}</p>}
          </div>
        )}

        {state.status === "ready" && state.records.length === 0 && (
          <div className="p-10 text-center font-mono text-sm text-mute">
            No transactions logged yet.
          </div>
        )}

        {state.status === "ready" && state.records.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="bg-panel font-mono text-xs uppercase tracking-wide text-mute">
              <tr>
                <th className="px-4 py-3">Cardholder</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {state.records.map((record) => {
                const level = riskLevelFor(record.risk_score);
                return (
                  <tr
                    key={record.transaction_id}
                    className={`border-t border-line ${
                      level === "high" ? "bg-alert/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">{record.cardholder_name}</td>
                    <td className="px-4 py-3 font-mono">{record.amount}</td>
                    <td className="px-4 py-3 font-mono">{record.country_code}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-xs ${LEVEL_STYLES[level]}`}
                      >
                        {record.risk_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-mute">
                      {record.reasons.join("; ") || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
