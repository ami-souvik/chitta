import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        surface: "#111111",
        "surface-2": "#1a1a1a",
        border: "#ffffff",
        "text-muted": "#888888",
        // accent palette
        "neon-green":  "#4ade80",
        "neon-red":    "#ff4d4d",
        "neon-yellow": "#fcd34d",
        "neon-purple": "#a78bfa",
        "neon-orange": "#fb923c",
        "neon-blue":   "#60a5fa",
        "neon-pink":   "#f472b6",
        // shadcn compat
        card: { DEFAULT: "#111111", foreground: "#ffffff" },
        primary: { DEFAULT: "#4ade80", foreground: "#000000" },
        secondary: { DEFAULT: "#1a1a1a", foreground: "#ffffff" },
        muted: { DEFAULT: "#1a1a1a", foreground: "#888888" },
        accent: { DEFAULT: "#a78bfa", foreground: "#000000" },
        destructive: { DEFAULT: "#ff4d4d" },
        input: "#1a1a1a",
        ring: "#4ade80",
      },
      borderRadius: {
        DEFAULT: "0px",
        sm: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        full: "9999px",
      },
      boxShadow: {
        brute:    "4px 4px 0px #ffffff",
        "brute-sm": "3px 3px 0px #ffffff",
        "brute-green":  "4px 4px 0px #4ade80",
        "brute-red":    "4px 4px 0px #ff4d4d",
        "brute-yellow": "4px 4px 0px #fcd34d",
        "brute-purple": "4px 4px 0px #a78bfa",
        "brute-orange": "4px 4px 0px #fb923c",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
