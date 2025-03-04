// initialize a stripe instance using Stripe publishable key

import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = new loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);
