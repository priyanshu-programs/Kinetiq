/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Canvas + surfaces. Fitova uses a single near-black canvas with
        // ~1% white glass fills; solid lifts read more predictably behind charts.
        canvas: { DEFAULT: "#171717", deep: "#101010" },
        surface: { DEFAULT: "#1c1c1c", raised: "#232323", glass: "#ffffff03" },
        hairline: { DEFAULT: "#ffffff1a", strong: "#ffffff33" },

        // Text ladder: #fff -> #ccc -> #aaa -> #575757
        ink: { DEFAULT: "#ffffff", 2: "#cccccc", 3: "#aaaaaa", 4: "#575757" },

        accent: { DEFAULT: "#c3ff96", dark: "#a8e878", ink: "#171717" },
        hot: { DEFAULT: "#ff2244", deep: "#f63e04" },
        stone: { DEFAULT: "#d3d2c7", dark: "#5b5a4f" },
        paper: "#f6f6f6",
      },
      fontFamily: {
        display: ["Anton", "Impact", "Haettenschweiler", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Anton display steps. Reference scale tops out at 120px (7.5rem).
        "display-sm": ["clamp(2.25rem, 5vw, 3.25rem)", { lineHeight: "0.98", letterSpacing: "0" }],
        "display-md": ["clamp(2.75rem, 7vw, 5rem)", { lineHeight: "0.95", letterSpacing: "0" }],
        "display-lg": ["clamp(3.25rem, 10vw, 7.5rem)", { lineHeight: "0.92", letterSpacing: "0" }],
      },
      // Reference radius is a tight 10px; retuning the scale keeps existing
      // rounded-lg / rounded-xl usages on-DNA without editing every file.
      borderRadius: { DEFAULT: "10px", lg: "10px", xl: "12px", "2xl": "16px" },
      maxWidth: { content: "1360px" },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: { marquee: "marquee 32s linear infinite" },
    },
  },
  plugins: [],
};
