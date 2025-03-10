// Example 'createCheckoutSession' in /functions/index.js
const admin = require("firebase-admin");
const {
  onCall,
  onRequest,
  HttpsError,
} = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { defineString } = require("firebase-functions/params");
const { Stripe } = require("stripe");

admin.initializeApp(); // initialize the app
const db = admin.firestore(); // access the database as admin

// secret stored in .env.local and/or .env.[firebase-project-name]
const stripeSecret = defineString("STRIPE_SECRET_KEY");

// Create Stripe Checkout Session
exports.createCheckoutSession = onCall(async (request) => {
  // from request we pass auth and data
  // in this case - data includes priceId for generating session
  // authenticate user and destructure request data
  const { data, auth } = request;
  // if no auth, throw error
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be authenticated to create a checkout session."
    );
  }
  // If needed, you can pull firebase user.uid from auth object
  const uid = auth.uid;
  // set priceId to variable from data sent in request
  const priceId = data.priceId;
  // If no priceId, throw error
  if (!priceId) {
    throw new HttpsError(
      "invalid-argument",
      "Missing required data to process request."
    );
  }
  // Add valid priceIds here to use for verification to ensure correct data
  const validPriceIds = [
    // Add your priceId or priceId(s) here to verify correct
  ];
  // Verify that priceId passed in request matches your valid priceId or Ids:
  // If request priceId does not match - throw error
  if (!validPriceIds.includes(priceId)) {
    throw new HttpsError(
      "invalid-argument",
      "PriceId in request does not exist."
    );
  }
  // Use try/catch to attempt establishing new stripe checkout session:
  try {
    // create new stripe instance using secret key
    const stripe = new Stripe(stripeSecret.value());
    // create a new stripe checkout session
    // Note: may need to adjust values or add data based on your needs
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: "you success URL here",
      // Success URL should have following format:
      // "baseURL/success?session_id={CHECKOUT_SESSION_ID}"
      // Next cancel URL - "baseURL/cancel"
      cancel_url: "your cancel URL here",
      // optionally, you can add metadata here if needed
      // for instance, here we include user.uid:
      metadata: {
        uid: uid,
      },
    });
    // if created successfully, we return the following:
    // that it was successful, the session.id, and the session.url
    return {
      success: true,
      sessionId: session.id,
      url: session.url,
    };
    // we catch errors, if any, and log and/or throw errors as needed
  } catch (error) {
    console.error("Error creating checkout session: ", error);
    if (error instanceof HttpsError) {
      throw error;
    } else {
      throw new HttpsError(
        "internal",
        "An error occurred while attempting to create a checkout session."
      );
    }
  }
});

// get current session information for success page data
// the getSession function is also an onCall used for getting current session info for:
// success page data and creating user receipt
exports.getSession = onCall(async (request) => {
  // in request, we include auth and data (here data is sessionId)
  // we destructure request to get auth and data
  const { auth, data } = request;
  // set sessionId to a variable from request data
  const sessionId = data.sessionId;
  // if no auth, throw an error
  if (!auth) {
    throw new HttpsError(
      "unauthenticated",
      "You must be authenticated to access."
    );
  }
  // if no sessionId, throw an error
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "Missing session ID.");
  }
  // use try/catch to retrieve session info
  try {
    // create stripe instance
    const stripe = new Stripe(stripeSecret.value());
    // retrieve session data using sessionId
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // if successful, return success = true, and session data
    return {
      success: true,
      session: session,
    };
    // catch errors if they occur
  } catch (error) {
    console.error(`Error retrieving session ID: ${error.message}`);
    throw new HttpsError("internal", "Error retrieving session ID.");
  }
});

// create s webhook to listen for stripe events
exports.stripeWebhook = onRequest(
  // set maxInstances and set rawBody: true
  { maxInstances: 1, rawBody: true },
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    response.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Stripe-Signature"
    );

    // handle preflight requests
    if (request.method === "OPTIONS") {
      response.status(200).send();
      return;
    }
    // Only accept POST requests
    if (request.method !== "POST") {
      throw new HttpsError("invalid-argument", "Method Not Allowed");
    }
    // set stripe-signature to variable
    const sig = request.headers["stripe-signature"];
    // define event variable
    let event;
    // Create stripe instance to listen for events
    // use try/catch to handle errors
    try {
      const stripe = new Stripe(stripeSecret.value());
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        webhookSecret.value()
      );
      // if error, log errors and return
    } catch (error) {
      logger.error("Webhook signature verification failed: ", error.message);
      response.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }
    // Handle the event - process successful purchase
    // set Stripe docs for all event types
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      // process the successful transaction
      // here, using a 'helper' function handleCheckoutSession
      await handleCheckoutSession(session);
    } else {
      logger.info(`Unhandled event type: ${event.type}`);
    }

    // Respond to Stripe to acknowledge receipt of the event
    response.json({ received: true });
  }
);

// helper functions
// Note: handleCheckoutSession logic will be specific to your project and needs
// this is an incomplete example to give you an idea of how to start
const handleCheckoutSession = async (session) => {
  // code to execute on successful checkout session
  // backend logic you want to execute only in the event of successful purchase/checkout
  // for instance, if set, you can extract user uid from session metadata
  // this would be set in createCheckoutSession
  const uid = session.metadata.uid;
  // just as a simple example of what you might do here:
  // try to access stripe line items from checkout session to access purchase data
  try {
    const stripe = new Stripe(stripeSecret.value());
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      }
    );

    // Access the line items
    const lineItems = sessionWithLineItems.line_items;
    // Pull out relevant data from lineItems
    // for instance, the priceId if there are multiple products to determine db updates needed
    if (lineItems && lineItems.data && lineItems.data.length > 0) {
      const lineItem = lineItems.data[0];
      // assign priceId to variable
      const priceId = lineItem.price.id;
    } else {
      logger.warn(
        `No line items found for session ${session.id} and user ${uid}`
      );
      return;
    }

    // You can then access the firestore database as admin and make any necessary updates
    // after successful user purchase
    // use a transaction to ensure atomicity
    // see top for imports, initializing app, and database
    await db.runTransaction(async (transaction) => {
      // Code to run your database transaction and make necessary updates
    });

    logger.info(`Successful... ${uid}`);
  } catch (error) {
    logger.error(`Error processing checkout session for user ${uid}: `, error);
  }
};
