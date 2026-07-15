import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
};

export const metadata: Metadata = {
  title: "SentryNode | Real-Time Fraud Detection Engine",
  description: "Instant transaction analysis with deterministic scoring. Detect and alert on fraudulent activity in milliseconds with SentryNode's serverless pipeline.",
  keywords: ["fraud detection", "transaction monitoring", "real-time analysis", "serverless"],
  robots: "index, follow",
  authors: [{ name: "SentryNode" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%233DDC84'/><stop offset='100%' stop-color='%231FA55B'/></linearGradient></defs><path d='M256 32 L416 96 V224 C416 336 344 432 256 480 C168 432 96 336 96 224 V96 Z' stroke='url(%23g)' stroke-width='20' fill='none' stroke-linejoin='round'/></svg>" />
      </head>
      <body className="min-h-screen bg-zinc-950 font-body text-zinc-100 antialiased">
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
