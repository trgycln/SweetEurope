import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ STRIPE_SECRET_KEY is not defined in environment variables. Using placeholder for build.');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20' as any,
  appInfo: {
    name: 'ElysonSweets B2B',
    version: '1.0.0',
  },
});

