// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryGreen: '#007229', // Custom green color
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
};
