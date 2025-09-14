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

  // Keep dynamic/rarely-used utility classes so animations and panels don't break
  safelist: [
    // FAQ chevron + general rotations/opacity
    "rotate-0",
    "rotate-180",
    "opacity-0",
    "opacity-100",

    // Accordion transitions (both old and new versions you tried)
    "transition-all",
    "transition-[max-height]",
    "transition-[max-height,opacity]",
    "transition-[grid-template-rows]",
    "duration-300",
    "ease-in-out",

    // Heights used for expand/collapse
    "max-h-0",
    "max-h-40",
    "max-h-96",

    // Grid rows trick (if used anywhere)
    "grid",
    "grid-rows-[0fr]",
    "grid-rows-[1fr]",
  ],

  plugins: [
    require("@tailwindcss/line-clamp"), // used by ProductCard multi-line titles
  ],
};