import nativewind from "nativewind/preset";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class", // recommended for NativeWind
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    // add more if you keep code elsewhere:
    "./{hooks,lib,features}/**/*.{ts,tsx}",
  ],
  presets: [nativewind],
  theme: {
    extend: {
      // ⚠️ RN doesn't support CSS variables; prefer fixed tokens or use NativeWind theming
      colors: {
        primary: "#3B82F6",
        "primary-dark": "#1E40AF",
        accent: "#F59E0B",
        success: "#10B981",
        text: "#111827",
        subtext: "#6B7280",
      },
      borderRadius: {
        lg: 16,
        md: 12,
        sm: 8,
      },
      spacing: {
        unit: 8, // use a numeric token for RN (e.g., p-unit => 8)
      },
      boxShadow: {
        card: "0 2px 10px rgba(17,24,39,0.06)",
        sheet: "0 8px 30px rgba(17,24,39,0.12)",
      },
      fontFamily: {
        // For RN, make sure you’ve loaded these fonts via Expo and use their exact postscript names
        sans: [
          "Poppins",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Arial",
        ],
      },
    },
  },
  plugins: [],
};
