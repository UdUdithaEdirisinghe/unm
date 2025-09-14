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
  // 👇 Safelist anything used dynamically so Cart/Checkout/FAQ don’t break
  safelist: [
    // rotations / opacity used in FAQ chevrons and transitions
    "rotate-0",
    "rotate-180",
    "opacity-0",
    "opacity-100",

    // max-height transitions used for accordions
    "max-h-0",
    "max-h-40",
    "max-h-96",
    "transition-all",
    "transition-[max-height]",
    "transition-[max-height,opacity]",
    "duration-300",

    // (If you kept the grid-rows trick anywhere)
    "grid",
    "grid-rows-[0fr]",
    "grid-rows-[1fr]",
    "transition-[grid-template-rows]",
  ],
  plugins: [
    require("@tailwindcss/line-clamp"), // needed by ProductCard multi-line names
  ],
};