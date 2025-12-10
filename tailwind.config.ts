import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/react";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'charcoal-blue': '#2f4858',
        'baltic-blue': '#33658a',
        'strong-cyan': '#55dde0',
        'honey-bronze': '#f6ae2d',
        'blaze-orange': '#f26419',
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        dark: {
          colors: {
            primary: {
              DEFAULT: '#55dde0',
              foreground: '#000000',
            },
            secondary: {
              DEFAULT: '#f6ae2d',
              foreground: '#000000',
            },
            success: {
              DEFAULT: '#10b981',
              foreground: '#ffffff',
            },
            warning: {
              DEFAULT: '#f6ae2d',
              foreground: '#000000',
            },
            danger: {
              DEFAULT: '#f26419',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};

export default config;
