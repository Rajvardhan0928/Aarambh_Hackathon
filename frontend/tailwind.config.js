/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          900: "#0b0f19",
          800: "#111827",
          700: "#1f2937",
          600: "#374151",
          accent: "#3b82f6",
          danger: "#ef4444",
          warning: "#f59e0b",
          success: "#10b981",
        }
      }
    },
  },
  plugins: [],
}
