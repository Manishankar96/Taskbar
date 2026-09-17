import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { Capacitor, registerPlugin } from "@capacitor/core";

import app from "./firebaseConfig";

const auth = getAuth(app);

// ---------------------------------------------------------
// Google Provider
// ---------------------------------------------------------

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

// ---------------------------------------------------------
// Native Android Google Auth Plugin
// ---------------------------------------------------------

const GoogleAuth = registerPlugin("GoogleAuth");

// ---------------------------------------------------------
// Google Sign-In
// ---------------------------------------------------------

export const signInWithGoogle = async () => {
  // -------------------------------------------------------
  // Android
  // -------------------------------------------------------

  if (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  ) {
    try {
      const result = await GoogleAuth.signIn();

      if (!result?.idToken) {
        throw new Error("Google ID token was not received.");
      }

      // Convert the Google ID token into a Firebase credential.
      const credential = GoogleAuthProvider.credential(
        result.idToken
      );

      // Sign in to the SAME Firebase JS Auth instance
      // used by the React/Firestore application.
      return await signInWithCredential(
        auth,
        credential
      );
    } catch (error) {
      console.error(
        "Android Google Sign-In Error:",
        error
      );

      throw error;
    }
  }

  // -------------------------------------------------------
  // PC / Web
  // -------------------------------------------------------

  return await signInWithPopup(
    auth,
    googleProvider
  );
};

// ---------------------------------------------------------
// Logout
// ---------------------------------------------------------

export const logout = () => {
  return signOut(auth);
};

// ---------------------------------------------------------
// Firebase Auth
// ---------------------------------------------------------

export { auth };