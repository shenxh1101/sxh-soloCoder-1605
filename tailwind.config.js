/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        "cream-coffee": {
          50: "#F9F3EC",
          100: "#F3E7D9",
          200: "#E7D0B3",
          300: "#DBB88E",
          400: "#CFA168",
          500: "#C89F7B",
          600: "#B08560",
          700: "#8E6A4B",
          800: "#6C5037",
          900: "#4A3623",
        },
        mint: {
          50: "#F0F9F5",
          100: "#E0F3EA",
          200: "#C1E7D5",
          300: "#A2DBC1",
          400: "#8FCFAD",
          500: "#6FBF95",
          600: "#569E78",
          700: "#41785A",
          800: "#2D533D",
          900: "#192D20",
        },
        "warm-bg": "#FAF7F2",
        "warm-text": "#6B5B4F",
      },
      fontFamily: {
        nunito: ["Nunito", "sans-serif"],
        quicksand: ["Quicksand", "sans-serif"],
      },
    },
  },
  plugins: [],
};
