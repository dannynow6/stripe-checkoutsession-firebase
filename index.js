// Example 'createCheckoutSession' in /functions/index.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const { Stripe } = require("stripe");

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
