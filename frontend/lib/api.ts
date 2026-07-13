/**
 * All network calls to the SentryNode backend go through this file.
 * Nothing else in the app should call fetch() directly against the
 * ingestion or monitoring endpoints.
 */
import type { AuditRecord, TransactionPayload } from "./types";

const INGESTION_API_URL = process.env.NEXT_PUBLIC_INGESTION_API_URL ?? "";
const MONITORING_API_URL = process.env.NEXT_PUBLIC_MONITORING_API_URL ?? "";

export class ApiConfigError extends Error {}

export async function submitTransaction(
  payload: TransactionPayload
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!INGESTION_API_URL) {
    throw new ApiConfigError(
      "NEXT_PUBLIC_INGESTION_API_URL is not set. Copy .env.example to .env.local " +
        "and fill in the IngestionApiUrl from `sam deploy` output."
    );
  }

  try {
    const res = await fetch(INGESTION_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return { ok: false, error: `Ingestion API responded with ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network request failed",
    };
  }
}

/**
 * Phase 1 has no read API for the audit table (see docs/architecture.md,
 * "out of scope"). This returns a typed "not connected" result rather
 * than fake data — the Monitoring Feed page renders that state honestly.
 */
export async function fetchAuditFeed(): Promise<
  { ok: true; records: AuditRecord[] } | { ok: false; reason: "not_connected" | "error"; detail?: string }
> {
  if (!MONITORING_API_URL) {
    return { ok: false, reason: "not_connected" };
  }

  try {
    const res = await fetch(MONITORING_API_URL);
    if (!res.ok) {
      return { ok: false, reason: "error", detail: `responded with ${res.status}` };
    }
    const records = (await res.json()) as AuditRecord[];
    return { ok: true, records };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      detail: err instanceof Error ? err.message : "request failed",
    };
  }
}
