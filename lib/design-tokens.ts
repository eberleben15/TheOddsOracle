/**
 * Design System - Color Tokens for The Odds Oracle
 * 
 * A clean white and gray theme with excellent contrast
 * and clear visual hierarchy.
 */

export const colors = {
  // Primary - Gray scale (main theme)
  primary: {
    50: '#F9FAFB',   // Body background
    100: '#F3F4F6',  // Light backgrounds
    200: '#E5E7EB',  // Borders
    300: '#D1D5DB',  // Subtle borders
    400: '#9CA3AF',  // Disabled text
    500: '#6B7280',  // Body text
    600: '#4B5563',  // Primary actions
    700: '#374151',  // Dark text
    800: '#1F2937',  // Very dark text
    900: '#111827',  // Darkest text
  },
  
  // Semantic colors (all gray scale)
  success: '#6B7280',  // Gray-500
  warning: '#6B7280',  // Gray-500
  danger: '#6B7280',   // Gray-500
  info: '#4B5563',     // Gray-600
  
  // Grayscale (Tailwind standard)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

export const gradients = {
  primary: 'from-gray-600 to-gray-700',
  secondary: 'from-gray-500 to-gray-600',
  accent: 'from-gray-400 to-gray-500',
  subtle: 'from-gray-100 to-gray-50',
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

