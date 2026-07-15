import Link from "next/link";

function ZapIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M13 2 5 14h6l-1 8 8-12h-6l1-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 3 5 6v5c0 5 3.4 8.5 7 10 3.6-1.5 7-5 7-10V6l-7-3Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m9.5 12 1.7 1.7 3.3-3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15 17H5a2 2 0 0 1-2-2 2 2 0 0 1 .8-1.6L5 11V9a5 5 0 0 1 10 0v2l1.2 2.4A2 2 0 0 1 17 15a2 2 0 0 1-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 17a3 3 0 0 0 6 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  // Mock stats for demo - in a real app, these would come from an API
  const stats = [
    { label: "Transactions Processed", value: "12,450", change: "+12.5%" },
    { label: "Fraudulent Attempts Blocked", value: "89", change: "-8.2%" },
    { label: "System Uptime", value: "99.98%", change: "+0.02%" },
    { label: "Average Response Time", value: "142ms", change: "-18ms" }
  ];

  const features = [
    {
      title: "Instant Ingestion",
      description: "API Gateway writes directly to an SQS queue — no compute sits in the hot path between a transaction and its place in line.",
      icon: "Zap",
      iconClass: "text-accent",
      iconBgClass: "bg-accent/20"
    },
    {
      title: "Deterministic Scoring",
      description: "A single Lambda scores each transaction against a rule set — amount, origin country, and IP shape — capped at 100 and flagged at 50 or above.",
      icon: "Shield",
      iconClass: "text-accent",
      iconBgClass: "bg-accent/20"
    },
    {
      title: "Instant Alerting",
      description: "High-risk results publish to SNS immediately, fanning out to email today and chat or SMS later without touching the scorer.",
      icon: "Bell",
      iconClass: "text-accent",
      iconBgClass: "bg-accent/20"
    }
  ];

  const iconMap = {
    Zap: ZapIcon,
    Shield: ShieldIcon,
    Bell: BellIcon
  };

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="relative z-10 pt-16 pb-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent/80">
            Phase 1 · Deterministic Scoring
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-tight tracking-tight text-text sm:text-6xl md:text-7xl">
            Every transaction, analyzed the moment it lands.
          </h1>
          <div className="mt-8 flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 w-fit">
            <span className="text-lg font-semibold text-accent">99.98%</span>
            <span className="text-sm text-text-secondary">Uptime · <span className="text-success">Live</span></span>
          </div>
          <p className="mt-8 max-w-xl text-lg text-text-secondary leading-relaxed">
            SentryNode ingests transactions through a queued pipeline, scores each one against a deterministic rule set, logs every result, and alerts a human the instant something crosses the line.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 sm:gap-3">
            <Link
              href="/emulator"
              className="relative overflow-hidden rounded-lg bg-accent px-6 py-3 font-mono text-sm font-semibold text-text shadow-lg shadow-accent/30 transition-all duration-300 hover:bg-accent/95 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 group"
            >
              <span className="relative z-10 block transition-transform duration-300 group-hover:scale-105">Send a test transaction</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="/monitoring"
              className="relative overflow-hidden rounded-lg border border-secondary/50 bg-secondary/50 px-6 py-3 font-mono text-sm font-semibold text-text transition-all duration-300 hover:border-accent/40 hover:bg-secondary/80 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 group"
            >
              <span className="relative z-10 block transition-transform duration-300 group-hover:scale-105">View monitoring feed</span>
            </Link>
          </div>
        </div>

        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-accent/5 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="group rounded-xl border border-secondary/50 bg-secondary/50 p-6 transition-all duration-300 hover:border-accent/30 hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-1 cursor-default"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs uppercase tracking-wide text-text-secondary group-hover:text-accent/70 transition-colors duration-300">
                {stat.label}
              </p>
              <span className={`transition-colors duration-300 ${stat.change.startsWith('-') ? 'text-danger group-hover:text-danger/80' : 'text-success group-hover:text-success/80'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-display font-semibold text-text group-hover:text-accent/90 transition-colors duration-300">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Features Section */}
      <section className="relative">
        <h2 className="mb-2 text-center font-display text-4xl font-semibold text-text">How it works</h2>
        <p className="mb-10 text-center text-text-secondary">Three-stage pipeline optimized for speed and precision</p>
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];

            return (
              <div
                key={index}
                className="group flex h-full flex-col rounded-2xl border border-secondary bg-secondary/50 p-8 transition-all duration-400 hover:-translate-y-2 hover:border-accent/40 hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"></div>
                <div className="relative z-10 mb-4 flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconBgClass} transition-all duration-300 group-hover:scale-110`}>
                    <Icon className={`h-6 w-6 ${feature.iconClass}`} />
                  </div>
                  <h3 className="font-semibold text-text text-lg group-hover:text-accent/90 transition-colors duration-300">{feature.title}</h3>
                </div>
                <p className="relative z-10 flex-1 leading-relaxed text-text-secondary text-sm">
                  {feature.description}
                </p>
                <div className="relative z-10 mt-6 h-1.5 overflow-hidden rounded-full bg-secondary/50">
                  <div className="h-full w-2/3 bg-accent transition-all duration-1000 group-hover:w-4/5"></div>
                </div>
                <p className="relative z-10 mt-2 text-xs uppercase tracking-wider text-text-secondary group-hover:text-accent/60 transition-colors duration-300">
                  Processing efficiency
                </p>
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-text-secondary">
          Each stage is designed for speed and precision without sacrificing auditability.
        </p>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 sm:py-24">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="font-display text-4xl sm:text-5xl font-semibold text-text mb-4">
            Ready to see SentryNode in action?
          </h2>
          <p className="text-lg text-text-secondary max-w-lg mx-auto leading-relaxed">
            Start testing transactions immediately and watch our fraud detection engine work in real-time.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row sm:justify-center gap-4 sm:gap-3">
            <Link
              href="/emulator"
              className="flex-1 sm:flex-none relative overflow-hidden rounded-lg bg-accent px-8 py-4 font-mono font-semibold text-text transition-all duration-300 hover:bg-accent/95 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 shadow-lg shadow-accent/30 group"
            >
              <span className="relative z-10 block transition-transform duration-300 group-hover:scale-105">Start Testing</span>
              <div className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            </Link>
            <Link
              href="/monitoring"
              className="flex-1 sm:flex-none relative overflow-hidden rounded-lg border border-secondary/50 bg-secondary/50 px-8 py-4 font-mono font-semibold text-text transition-all duration-300 hover:border-accent/40 hover:bg-secondary/80 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 group"
            >
              <span className="relative z-10 block transition-transform duration-300 group-hover:scale-105">View Monitor</span>
            </Link>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-accent/5 rounded-full transform -rotate-45 blur-xl"></div>
          <div className="absolute bottom-0 right-1/2 -translate-x-1/2 w-[150px] h-[150px] bg-accent/3 rounded-full transform rotate-30 blur-xl"></div>
        </div>
      </section>
    </div>
  );
}