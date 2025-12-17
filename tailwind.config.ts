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
        // White and gray theme with subtle accents
        'sidebar-dark': '#1C2434',
        'sidebar-darker': '#161D28',
        'primary': '#4B5563', // Gray-600
        'body-bg': '#F9FAFB', // Gray-50
        'card-bg': '#FFFFFF',
        'text-dark': '#111827', // Gray-900
        'text-body': '#6B7280', // Gray-500
        'border-gray': '#E5E7EB', // Gray-200
        
        // Subtle accent colors for visual distinction
        'live': '#EF4444', // Red-500 for live games
        'live-light': '#FEE2E2', // Red-100 for live backgrounds
        'win': '#10B981', // Emerald-500 for wins
        'win-light': '#D1FAE5', // Emerald-100 for win backgrounds
        'loss': '#6B7280', // Gray-500 for losses
        'loss-light': '#F3F4F6', // Gray-100 for loss backgrounds
        'value': '#3B82F6', // Blue-500 for value bets
        'value-light': '#DBEAFE', // Blue-100 for value backgrounds
        'prediction': '#8B5CF6', // Purple-500 for predictions
        'prediction-light': '#EDE9FE', // Purple-100 for prediction backgrounds
        
        // Semantic colors (subtle)
        'success': '#10B981', // Emerald-500
        'success-light': '#D1FAE5', // Emerald-100
        'warning': '#F59E0B', // Amber-500
        'warning-light': '#FEF3C7', // Amber-100
        'danger': '#EF4444', // Red-500
        'danger-light': '#FEE2E2', // Red-100
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
              DEFAULT: '#4B5563',
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
              DEFAULT: '#EF4444',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};

export default config;
