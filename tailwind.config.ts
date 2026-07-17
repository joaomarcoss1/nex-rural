import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#163b2c",
        leaf: "#2f7d4f",
        moss: "#6f8f57",
        wheat: "#f3ead8",
        gold: "#c49a45",
        ink: "#1d2521"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(22, 59, 44, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
