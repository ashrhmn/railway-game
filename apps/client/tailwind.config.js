/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["src/**/*.tsx"],
  theme: {
    extend: {
      screens: {
        ti: "320px",
        xs: "490px",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["wireframe", "dracula"],
    darkTheme: "dracula",
  },
};
