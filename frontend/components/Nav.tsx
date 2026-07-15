"use client";

import Link from "next/link";
import { useState } from "react";

export default function Nav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-10 border-b border-secondary/50 bg-secondary/50 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 transition-transform duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512"
            fill="none"
            className="h-7 w-7 shrink-0"
            aria-label="SentryNode logo"
          >
            <defs>
              <linearGradient id="shieldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3DDC84" />
                <stop offset="100%" stopColor="#1FA55B" />
              </linearGradient>
            </defs>

            <path
              d="M256 32 L416 96 V224 C416 336 344 432 256 480 C168 432 96 336 96 224 V96 Z"
              stroke="url(#shieldGradient)"
              strokeWidth="20"
              fill="none"
              strokeLinejoin="round"
            />

            <g stroke="url(#shieldGradient)" strokeWidth="12" strokeLinecap="round">
              <line x1="64" y1="176" x2="144" y2="176" />
              <line x1="64" y1="256" x2="144" y2="256" />
              <line x1="64" y1="336" x2="184" y2="336" />

              <circle cx="48" cy="176" r="10" fill="#30D873" />
              <circle cx="48" cy="256" r="10" fill="#30D873" />
              <circle cx="48" cy="336" r="10" fill="#30D873" />

              <circle cx="200" cy="336" r="10" fill="#30D873" />
              <line x1="320" y1="336" x2="448" y2="336" />
              <circle cx="464" cy="336" r="10" fill="#30D873" />
            </g>

            <path
              d="M318 140 H224 C182 140 160 165 160 196 C160 226 181 246 220 246 H292 C332 246 352 269 352 304 C352 342 322 372 276 372 H184"
              stroke="url(#shieldGradient)"
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span
            className="font-display text-lg font-semibold tracking-tight text-text transition-colors duration-300 hover:text-accent"
          >
            SentryNode
          </span>
        </Link>

        <div className="hidden md:flex gap-0.5 font-mono text-sm">
          <Link
            href="/emulator"
            className="relative overflow-hidden rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary/70 transition-all duration-300 hover:bg-accent/10 hover:text-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 group"
          >
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">
              Emulator
            </span>
          </Link>
          <Link
            href="/monitoring"
            className="relative overflow-hidden rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary/70 transition-all duration-300 hover:bg-accent/10 hover:text-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 group"
          >
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-0.5">
              Monitoring
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open menu"
          className="md:hidden p-1.5 rounded-lg hover:bg-accent/5"
        >
          <svg className="h-5 w-5 text-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 mt-1 space-y-1 px-2 pb-2">
          <Link
            href="/emulator"
            className="block rounded-lg px-3 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/10 hover:text-accent/90"
          >
            <span className="inline-block transition-transform duration-200">
              Emulator
            </span>
          </Link>
          <Link
            href="/monitoring"
            className="block rounded-lg px-3 py-2 text-text-secondary/70 transition-all duration-300 hover:bg-accent/10 hover:text-accent/90"
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