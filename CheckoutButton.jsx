// a client-side component where we call the firebase function (createCheckoutSession)
// and pass relevant priceId in request:
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
// import functions from firebase-config file
import { functions } from "@/lib/firebase/firebase.config";
import { httpsCallable } from "firebase/functions";
import { stripePromise } from "@/lib/stripe/stripeInit";

// I created a dynamic checkoutButton for this example because I had multiple
// purchase options and thus multiple priceIds.
// if you only have one purchase option (i.e., one priceId) - you can modify this easily

const CheckoutButtonDynamic = ({ priceId, btnInfo }) => {
  // get user object from AuthContext
  const { user } = useAuth();
  // set up loading state with useState
  const [loading, setLoading] = useState(false);
  // here I used useRouter to redirect if no authenticated user
  const router = useRouter();
  // Access firebase onCall function
  const createNewCheckoutSession = httpsCallable(
    functions,
    "createCheckoutSession"
  );
  // create a handleCheckout async function
  const handleCheckout = async () => {
    setLoading(true);
    // if user, use try/catch to call function
    if (user) {
      try {
        // make a request using await (include priceId in request as follows)
        const result = await createNewCheckoutSession({ priceId: priceId });
        // get sessionId from successful request
        const { sessionId } = result.data;
        // use stripe instance
        const stripe = await stripePromise;
        // use await to redirect to checkout session using returned sessionId
        await stripe.redirectToCheckout({ sessionId });
        // catch error
      } catch (error) {
        console.error("Error creating checkout session: ", error);
        setLoading(false);
      }
      // if no authorized user, log error and, if desired, redirect user
    } else {
      console.error("User is not authenticated");
      router.push("/somepathinyourapp");
    }
  };

  return (
    <button
      className="btn btn-success w-52 hover:scale-105 transition ease-in-out"
      disabled={loading}
      onClick={handleCheckout}
      aria-label={`${btnInfo}`}
    >
      {loading ? "Loading..." : `${btnInfo}`}
    </button>
  );
};

export default CheckoutButtonDynamic;
