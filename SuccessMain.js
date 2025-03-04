// a client-side main success page component or in your success page.js
// depends on how you want to set it up
// this is an example of how you can use the getSession function to retrieve
// session data to display to user on success page if you desire or to create a
// user receipt
// I included a receipt option but that's up to you - this will give you a start

"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { functions } from "@/lib/firebase/firebase.config";
import { httpsCallable } from "firebase/functions";
import Logo from "../../../public/logo.png";
import { PageLoading } from "../ui/loading";

const SuccessMain = () => {
  // destructure from AuthContext
  const { user, isLoading } = useAuth();
  const searchParams = useSearchParams();
  // get sessionId from URL searchParams
  const sessionId = searchParams.get("session_id");
  // use state to hold session data on client-side
  const [session, setSession] = useState(null);
  // router to redirect if needed
  const router = useRouter();
  // get onCall function from firebase /functions/index.js
  const getSession = httpsCallable(functions, "getSession");
  // use a useEffect to get session data on component mount
  useEffect(() => {
    // check if not loading and authenticated user
    if (!isLoading && user) {
      // check if sessionId in URL
      if (sessionId) {
        // pass sessionId to getSession to retrieve session data
        getSession({ sessionId: sessionId })
          .then((result) => {
            // get session data and set to state
            const { session } = result.data;
            setSession(session);
          })
          // catch error if any
          .catch((error) => {
            console.error("Error retrieving session: ", error);
          });
      }
      // redirect if no authorized user and not loading
    } else if (!isLoading && !user) {
      router.push("/somepath");
    }
  }, [user, isLoading, sessionId, router]);

  return (
    <>
      {/* if no session or currently loading - display loading screen */}
      {!session || isLoading ? (
        <PageLoading />
      ) : (
        <>
          <img
            src={Logo.src}
            alt="My app logo"
            className="w-36 h-36 md:w-56 md:h-56"
          />
          <h2 className="my-4 prose-sm sm:prose-lg">Payment Successful!</h2>
          {/* extract what data you want from session and display to user */}
          <p className="mb-3 prose-sm sm:prose-lg">
            Thank you for your purchase, {session.customer_details.name}.
          </p>
          <p className="mb-3 prose-sm sm:prose-lg">
            <strong>Payment Id:</strong> {session.payment_intent}
          </p>
        </>
      )}
    </>
  );
};

export default SuccessMain;
