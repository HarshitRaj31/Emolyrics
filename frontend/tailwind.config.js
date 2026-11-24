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
        sans: ["Manrope", "-apple-system", "sans-serif"],
        serif: ["'Playfair Display'", "Georgia", "serif"],
        display: ["'Playfair Display'", "Georgia", "serif"],
        editorial: ["'Playfair Display'", "Georgia", "serif"]
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
        },
        editorial: {
          wine: "#96283d",
          burgundy: "#b8334d",
          coral: "#d64a66",
          charcoal: "#0d0e12",
          paper: "#faf8f4",
          ivory: "#f5f2eb",
          graphite: "#181a22"
        },
        palette: {
          dark: "#111827",
          slate: "#374151",
          muted: "#9CA3AF",
          orange: "#F97316",
          light: "#F3F4F6"
        },
        brand: {
          DEFAULT: "#F97316",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#F97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12"
        },
        purple: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407"
        },
        indigo: {
          50: "#f3f4f6",
          100: "#fed7aa",
          200: "#fdba74",
          300: "#fb923c",
          400: "#f97316",
          500: "#ea580c",
          600: "#c2410c",
          700: "#9a3412",
          800: "#374151",
          900: "#1f2937",
          950: "#111827"
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
