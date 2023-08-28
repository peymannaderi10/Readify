/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: {
    content: ["./popup.html"],
    options: {
      safelist: [], // Add classes that should not be purged
    },
  },
  theme: {
    extend: {},
  },
  plugins: [],
}
