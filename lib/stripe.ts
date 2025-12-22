// Stripe integration (optional - only used if STRIPE_SECRET_KEY is set)
// Install stripe package: npm install stripe
// This file will only work if stripe is installed and configured

// Use a function to lazily load stripe to avoid build-time errors
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  try {
    // Dynamic require - only executed at runtime
    const Stripe = require("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
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
