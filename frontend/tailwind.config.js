import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        display: ["Outfit", "sans-serif"]
      },
      colors: {
        surface: {
          page: "rgb(var(--rgb-page) / <alpha-value>)",
          panel: "rgb(var(--rgb-surface) / <alpha-value>)",
          card: "rgb(var(--rgb-card) / <alpha-value>)",
          well: "rgb(var(--rgb-well) / <alpha-value>)"
        },
        ink: {
          main: "rgb(var(--rgb-text-main) / <alpha-value>)",
          secondary: "rgb(var(--rgb-text-secondary) / <alpha-value>)",
          muted: "rgb(var(--rgb-text-muted) / <alpha-value>)",
          dim: "rgb(var(--rgb-text-dim) / <alpha-value>)"
        }
      },
      animation: {
        "spin-slow": "spin 8s linear infinite",
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" }
        }
      }
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", "html.light &");
    })
  ],
};
