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
        // TailAdmin color scheme
        'sidebar-dark': '#1C2434',
        'sidebar-darker': '#161D28',
        'primary': '#3C50E0',
        'body-bg': '#F1F5F9',
        'card-bg': '#FFFFFF',
        'text-dark': '#1C2434',
        'text-body': '#64748B',
        'border-gray': '#E2E8F0',
        'success': '#10B981',
        'warning': '#F59E0B',
        'danger': '#F87171',
      },
    },
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: '#3C50E0',
              foreground: '#ffffff',
            },
            success: {
              DEFAULT: '#10B981',
              foreground: '#ffffff',
            },
            warning: {
              DEFAULT: '#F59E0B',
              foreground: '#ffffff',
            },
            danger: {
              DEFAULT: '#F87171',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};

export default config;
