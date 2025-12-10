/**
 * Design System - Color Tokens for The Odds Oracle
 * 
 * A professional sports betting color scheme with excellent contrast
 * and clear visual hierarchy.
 */

export const colors = {
  // Primary - Professional Blue (trust, stability)
  primary: {
    50: '#e6f1ff',
    100: '#b3d7ff',
    200: '#80bdff',
    300: '#4da3ff',
    400: '#1a89ff',
    500: '#0070f3', // Main primary
    600: '#005dd1',
    700: '#004aaf',
    800: '#00378d',
    900: '#00246b',
  },
  
  // Secondary - Emerald Green (winning, money, success)
  secondary: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Main secondary
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Accent - Amber (highlights, calls-to-action)
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b', // Main accent
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Semantic colors
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444',  // Red
  info: '#3b82f6',    // Blue
  
  // Grayscale (for dark mode)
  gray: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#0a0a0b',
  },
};

export const gradients = {
  primary: 'from-blue-500 to-blue-700',
  secondary: 'from-emerald-500 to-emerald-700',
  accent: 'from-amber-500 to-amber-700',
  subtle: 'from-gray-800 to-gray-900',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  glow: '0 0 20px rgba(0, 112, 243, 0.3)',
};

export const animations = {
  hover: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-150 ease-in-out',
  smooth: 'transition-all duration-300 ease-in-out',
};

