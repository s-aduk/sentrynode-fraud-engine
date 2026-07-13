/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // SentryNode "signal room" palette — a security-ops console, not
        // a generic SaaS look. Named hex values, committed deliberately:
        base: "#0B0F14",      // near-black slate, primary background
        panel: "#131A22",      // elevated surface (cards, table rows)
        line: "#22303C",      // hairline borders / dividers
        ink: "#D8E1E8",      // primary text, cool off-white
        mute: "#6E8494",      // secondary text / captions
        signal: "#3DDC97",      // safe / healthy state (cool signal-green)
        alert: "#FF4F5E",      // high-risk / danger state
        watch: "#F5A623",      // medium-risk / amber watch state
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      keyframes: {
        sweep: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        pulseRing: {
          "0%": { opacity: "0.6", transform: "scale(0.9)" },
          "100%": { opacity: "0", transform: "scale(1.6)" },
        },
      },
      animation: {
        sweep: "sweep 4s linear infinite",
        "pulse-ring": "pulseRing 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};
