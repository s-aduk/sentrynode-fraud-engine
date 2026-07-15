/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom color palette based on UI/UX Pro Max recommendations
      colors: {
        background: '#020617', // slate-950
        primary: '#0F172A',    // slate-900
        secondary: '#1E293B',  // slate-800
        tertiary: '#334155',   // slate-700
        accent: '#22C55E',     // emerald-500
        accentHover: '#16A34A',// emerald-600
        text: '#F8FAFC',       // slate-50
        textSecondary: '#64748B', // slate-400
        textMuted: '#94A3B8',  // slate-300
        danger: '#EF4444',     // red-500
        warning: '#F59E0B',    // amber-500
        success: '#10B981',    // emerald-500
      },
      fontFamily: {
        display: ["Fira Code", "var(--font-display)"],
        body: ["Fira Sans", "var(--font-body)"],
        mono: ["Fira Code", "var(--font-mono)"],
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
        typewriter: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
        blink: {
          "0%, 100%": { borderColor: "transparent" },
          "50%": { borderColor: "currentColor" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        sparkle: {
          "0%, 100%": { opacity: "0", transform: "scale(0)" },
          "50%": { opacity: "1", transform: "scale(1.2)" },
        }
      },
      animation: {
        sweep: "sweep 4s linear infinite",
        "pulse-ring": "pulseRing 1.6s ease-out infinite",
        typewriter: "typewriter 3.5s steps(40) forwards",
        blink: "blink 1s infinite",
        float: "float 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        sparkle: "sparkle 0.6s ease-out",
      },
      boxShadow: {
        'inner-glow': 'inset 0 0 15px rgba(34, 197, 94, 0.3)',
        'outer-glow': '0 0 20px rgba(34, 197, 94, 0.4)',
        'soft-glow': '0 0 15px rgba(34, 197, 94, 0.2)',
      }
    },
  },
  plugins: [],
};