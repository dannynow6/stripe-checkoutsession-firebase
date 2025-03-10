# Stripe Checkout Using Firebase Functions

- index.js (/functions/index.js):

  - createCheckoutSession: A firebase function using onCall to create a new checkout session.
  - getSession: A firebase function using onCall to retrieve session details after a successful checkout session.
  - stripeWebhook: A firebase function using onRequest that sets up a webhook to listen for Stripe checkout events
  - handleCheckoutSession: A helper function that is called in stipeWebhook. It contains necessary backend logic for your project to run on a successful user purchase.
    - Note: this is a striped down example. Any logic will be specific to your project.

- stripeInit.js:

  - A simple example of initializing a Stripe instance using publishable key

- CheckoutButton.jsx:

  - An example of a button component that calls firebase function createCheckoutSession to create a new checkout session

- SuccessMain.js:
  - An example of a success page component that calls firebase function getSession to get user session details and provide data on successful transaction
