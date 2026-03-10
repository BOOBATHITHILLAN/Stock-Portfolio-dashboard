/** @type {import('tailwindcss').Config} */
module.exports = {
  // These paths tell Tailwind CSS which files to scan for classes.
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};