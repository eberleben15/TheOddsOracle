// Stripe integration (optional - only used if STRIPE_SECRET_KEY is set)
// Install stripe package: npm install stripe
// This file will only work if stripe is installed and configured

// Use a function to lazily load stripe to avoid build-time errors
// This prevents Turbopack from trying to resolve the module at build time
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  try {
    // Use dynamic import to avoid build-time resolution issues with Turbopack
    // This will only execute at runtime
    if (typeof window === 'undefined') {
      // Server-side: use require
      const Stripe = require("stripe");
      return new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-06-20",
      });
    }
    return null; // Stripe is server-side only
  } catch (error) {
    console.warn("[STRIPE] Stripe package not installed. Install with: npm install stripe");
    return null;
  }
}

export const stripe = getStripe();

export const stripePrices = {
  premium: process.env.STRIPE_PRICE_PREMIUM,
  pro: process.env.STRIPE_PRICE_PRO,
};
