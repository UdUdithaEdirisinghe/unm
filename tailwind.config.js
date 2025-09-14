/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src//*.{js,ts,jsx,tsx}",   // ✅ catch all nested files
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
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.02)",
      },
      borderColor: {
        skin: "#1f2a44",
      },
    },
  },
  safelist: [
    "btn-primary",
    "btn-secondary",
    "btn-ghost",
    "field",
    "textarea",
    "select",
    "card",
    "panel",
    "line-clamp-1",
    "line-clamp-2",
    "line-clamp-3",
  ],
  plugins: [],
};