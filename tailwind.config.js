/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages//*.{js,ts,jsx,tsx}",
    "./src/components//*.{js,ts,jsx,tsx}",
    "./src/app//*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0b1220",
          card: "#0e1830",
          accent: "#8ab4ff",
          accent2: "#6ee7f9",
        },
      },
    },
  },
  plugins: [
    require("@tailwindcss/line-clamp"), // ← needed for line-clamp-2 / sm:line-clamp-3
  ],
};