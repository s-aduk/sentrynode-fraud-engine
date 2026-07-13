import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">
          Phase 1 · Heuristic scoring
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Every transaction, watched the moment it lands.
        </h1>
        <p className="mt-4 max-w-xl text-mute">
          SentryNode ingests transactions through a queued pipeline, scores
          each one against a deterministic rule set, logs every result, and
          alerts a human the instant something crosses the line.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/emulator"
            className="rounded-md bg-signal px-4 py-2 font-mono text-sm font-medium text-base transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Send a test transaction
          </Link>
          <Link
            href="/monitoring"
            className="rounded-md border border-line px-4 py-2 font-mono text-sm text-ink transition-colors hover:border-mute focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            View monitoring feed
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-mute">Ingest</p>
          <p className="mt-2 text-sm text-ink">
            API Gateway writes directly to an SQS queue — no compute sits in
            the hot path between a transaction and its place in line.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-mute">Evaluate</p>
          <p className="mt-2 text-sm text-ink">
            A single Lambda scores each transaction against a rule set —
            amount, origin country, and IP shape — capped at 100 and flagged
            at 50 or above.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <p className="font-mono text-xs uppercase tracking-wide text-mute">Alert</p>
          <p className="mt-2 text-sm text-ink">
            High-risk results publish to SNS immediately, fanning out to
            email today and chat or SMS later without touching the scorer.
          </p>
        </div>
      </section>
    </div>
  );
}
