// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryGreen: '#4A6798', // ERR deep blue (was #007229 green); white text on it stays readable
        // ERR brand colours (from the logo / brand guide)
        brand: { blue: '#5D7EB3', deep: '#4A6798', darker: '#3F5A87', orange: '#F9A778', orangeSoft: '#FDEBDF' },
        // Map the green scale to ERR blue so every existing green-* class follows the brand
        green: { 50:'#EEF2F8',100:'#DCE4F1',200:'#BCCBE3',300:'#9BB0D4',400:'#7B96C4',500:'#5D7EB3',600:'#4A6798',700:'#3F5A87',800:'#33496D',900:'#263754' },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
};
