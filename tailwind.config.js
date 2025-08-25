/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  presets: [require("nativewind/preset")],
  theme: {
     extend: {
     colors: {
        primary: "var(--color-primary)",
        "primary-dark": "var(--color-primary-dark)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        text: "var(--color-text)",
        subtext: "var(--color-subtext)",
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
      spacing: {
        unit: "var(--spacing-unit)", // so you can do p-unit, m-unit etc.
      },
      boxShadow: {
        card: '0 2px 10px rgba(17,24,39,0.06)',
        sheet:'0 8px 30px rgba(17,24,39,0.12)',
      },
      fontFamily: {
        sans: ['Poppins','ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','Arial']
      }
    },
  },
  plugins: [],
};
