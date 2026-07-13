import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-line bg-panel/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-signal"
            aria-hidden="true"
          />
          SentryNode
        </Link>
        <nav className="flex gap-1 font-mono text-sm">
          <Link
            href="/emulator"
            className="rounded px-3 py-1.5 text-mute transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Emulator
          </Link>
          <Link
            href="/monitoring"
            className="rounded px-3 py-1.5 text-mute transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Monitoring
          </Link>
        </nav>
      </div>
    </header>
  );
}
