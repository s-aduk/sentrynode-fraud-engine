"use client";

import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-10 border-b border-secondary/50 bg-secondary/50 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 transition-transform duration-300"
        >
          <div className="relative w-8 h-8 transition-all duration-300">
            <div className="absolute inset-0 rounded-full bg-accent/20"></div>
            <div className="absolute inset-0 rounded-full bg-accent/10 blur-sm"></div>
            <div className="absolute inset-0 rounded-full bg-accent/5"></div>
          </div>
          <span
            className="font-display text-lg font-semibold tracking-tight text-text transition-colors duration-300 hover:text-accent"
          >
            SentryNode
          </span>
        </Link>

        <div className="hidden md:flex gap-1 font-mono text-sm">
          <Link
            href="/emulator"
            className="relative overflow-hidden rounded-lg px-3.5 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/5 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <span className="inline-block transition-transform duration-300">
              Emulator
            </span>
          </Link>
          <Link
            href="/monitoring"
            className="relative overflow-hidden rounded-lg px-3.5 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/5 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
          >
            <span className="inline-block transition-transform duration-300">
              Monitoring
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open menu"
          className="md:hidden p-2 rounded-lg hover:bg-accent/5"
        >
          <svg className="h-5 w-5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 mt-2 space-y-1 px-2 pb-3">
          <Link
            href="/emulator"
            className="block rounded-lg px-3 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/5 hover:text-text"
          >
            <span className="inline-block transition-transform duration-200">
              Emulator
            </span>
          </Link>
          <Link
            href="/monitoring"
            className="block rounded-lg px-3 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/5 hover:text-text"
          >
            <span className="inline-block transition-transform duration-200">
              Monitoring
            </span>
          </Link>
        </div>
      )}
    </header>
  );
}