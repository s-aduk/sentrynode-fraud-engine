import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-20 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-accent/80">
        404
      </p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-text">
        Page not found
      </h1>
      <p className="mt-4 max-w-xl text-text-secondary">
        The page you’re looking for doesn’t exist or may have moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-accent px-5 py-2.5 font-mono text-sm font-medium text-text transition-all duration-300 hover:bg-accent/90"
      >
        Return home
      </Link>
    </main>
  );
}
