import Link from "next/link";

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
      color: "accent"
    },
    {
      title: "Deterministic Scoring",
      description: "A single Lambda scores each transaction against a rule set — amount, origin country, and IP shape — capped at 100 and flagged at 50 or above.",
      icon: "Shield",
      color: "accent"
    },
    {
      title: "Instant Alerting",
      description: "High-risk results publish to SNS immediately, fanning out to email today and chat or SMS later without touching the scorer.",
      icon: "Bell",
      color: "accent"
    }
  ];

  return (
    <div className="flex flex-col gap-12">
      {/* Hero Section */}
      <section className="relative">
        <div className="relative z-10 pt-16 pb-20">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent/80">
            Phase 1 · Deterministic Scoring
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight text-text sm:text-5xl md:text-6xl">
            Every transaction, analyzed the moment it lands.
          </h1>
          <p className="mt-6 max-w-xl text-text-secondary">
            SentryNode ingests transactions through a queued pipeline, scores each one against a deterministic rule set, logs every result, and alerts a human the instant something crosses the line.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/emulator"
              className="flex items-center gap-3 rounded-lg bg-accent px-5 py-2.5 font-mono text-sm font-medium text-text shadow-lg shadow-accent/20 transition-all duration-300 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              Send a test transaction
            </Link>
            <Link
              href="/monitoring"
              className="flex items-center gap-3 rounded-lg border border-secondary/50 bg-secondary/50 px-5 py-2.5 font-mono text-sm text-text-secondary transition-all duration-300 hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              View monitoring feed
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
            className={`rounded-xl border border-secondary/50 bg-secondary/50 p-6 transition-all duration-300 hover:border-secondary/70 hover:bg-secondary/60 animate-fade-in-up-${index}`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-xs uppercase tracking-wide text-text-secondary">
                {stat.label}
              </p>
              <span className={stat.change.startsWith('-') ? 'text-danger' : 'text-success'}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-display font-semibold text-text">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Features Section - Horizontal Scroll Journey */}
      <section className="relative">
        <h2 className="mb-8 font-display text-3xl font-semibold text-text-center">How it works</h2>
        <div className="relative overflow-hidden">
          <div className="flex space-x-6 px-4 pb-12 scrollbar-hide">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex-shrink-0 w-[320px] rounded-2xl border border-secondary bg-secondary/50 p-8 transition-all duration-400 hover:border-accent/50 hover:bg-accent/5 hover:shadow-lg hover:shadow-accent/10 hover:-translate-y-2 feature-card-${index}`}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-${feature.color}/20 flex items-center justify-center mb-2`}>
                    {/* In a real app, we'd use actual icons like Lucide or Heroicons */}
                    <span className={`text-${feature.color} font-bold`}>{feature.icon}</span>
                  </div>
                  <h3 className="ml-4 font-semibold text-text">{feature.title}</h3>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
                {/* Progress bar visualization */}
                <div className="mt-6 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-2/3 transition-all duration-1000"></div>
                </div>
                <p className="mt-2 text-xs text-text-secondary uppercase tracking-wider">
                  Processing efficiency
                </p>
              </div>
            ))}
          </div>
          {/* Scroll indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-1">
            <div className="w-2 h-2 rounded-full bg-text/20"></div>
            <div className="w-2 h-2 rounded-full bg-text/20"></div>
            <div className="w-2 h-2 rounded-full bg-text/20"></div>
          </div>
        </div>
        <p className="mt-6 text-center text-text-secondary max-w-2xl mx-auto">
          Scroll horizontally to explore each stage of our fraud detection pipeline
        </p>
      </section>

      {/* CTA Section */}
      <section className="relative py-16">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-semibold text-text mb-6">
            Ready to see sentrynine in action?
          </h2>
          <p className="text-text-secondary max-w-lg mx-auto">
            Start testing transactions immediately and watch our fraud detection engine work in real-time.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row sm:justify-center gap-4">
            <Link
              href="/emulator"
              className="flex-1 min-w-[200px] rounded-lg bg-accent px-6 py-3 font-mono font-medium text-text transition-all duration-300 hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 shadow-lg shadow-accent/20 relative overflow-hidden"
            >
              <span className="relative z-10 block transition-transform duration-300">Start Testing</span>
            </Link>
            <Link
              href="/monitoring"
              className="flex-1 min-w-[200px] rounded-lg border border-secondary/50 bg-secondary/50 px-6 py-3 font-mono font-medium text-text-secondary transition-all duration-300 hover:bg-secondary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 border-2 border-transparent hover:border-accent/50"
            >
              <span className="relative z-10 block transition-transform duration-300">View Monitor</span>
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