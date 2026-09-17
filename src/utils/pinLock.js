
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth } from "../firebase/auth";
import { db } from "../firebase/firestore";

const PIN_COLLECTION = "security";
const PIN_DOCUMENT = "pin";

/* =========================================================
   CURRENT USER
   ========================================================= */

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "You must be logged in to use PIN security."
    );
  }

  return user;
}

/* =========================================================
   PIN DOCUMENT REFERENCE
   ========================================================= */

function getPinDocumentReference() {
  const user = getCurrentUser();

  return doc(
    db,
    "users",
    user.uid,
    PIN_COLLECTION,
    PIN_DOCUMENT
  );
}

/* =========================================================
   PIN VALIDATION
   ========================================================= */

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin));
}

/* =========================================================
   GENERATE SALT
   ========================================================= */

function generateSalt() {
  if (
    typeof crypto === "undefined" ||
    typeof crypto.getRandomValues !== "function"
  ) {
    throw new Error(
      "Secure random number generation is not available."
    );
  }

  const bytes = new Uint8Array(16);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

/* =========================================================
   HASH PIN
   ========================================================= */

async function hashPin(pin, salt) {
  if (
    typeof crypto === "undefined" ||
    !crypto.subtle
  ) {
    throw new Error(
      "Secure hashing is not available on this device."
    );
  }

  const encoder = new TextEncoder();

  const data = encoder.encode(
    `${salt}:${pin}`
  );

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer)
  );

  return hashArray
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

/* =========================================================
   CHECK WHETHER PIN EXISTS
   ========================================================= */

export async function hasPin() {
  const pinRef =
    getPinDocumentReference();

  const snapshot =
    await getDoc(pinRef);

  return snapshot.exists();
}

/* =========================================================
   GET PIN STATUS
   ========================================================= */

export async function getPinStatus() {
  const pinRef =
    getPinDocumentReference();

  const snapshot =
    await getDoc(pinRef);

  if (!snapshot.exists()) {
    return {
      exists: false,
      enabled: false,
    };
  }

  const data =
    snapshot.data();

  return {
    exists: true,

    // Existing PIN documents without
    // an enabled field remain ON.
    enabled: data.enabled !== false,
  };
}

/* =========================================================
   CREATE PIN
   ========================================================= */

export async function createPin(pin) {
  const pinValue = String(pin);

  if (!isValidPin(pinValue)) {
    throw new Error(
      "PIN must be exactly 4 digits."
    );
  }

  const pinRef =
    getPinDocumentReference();

  const existing =
    await getDoc(pinRef);

  if (existing.exists()) {
    throw new Error(
      "A PIN already exists."
    );
  }

  const salt =
    generateSalt();

  const hash =
    await hashPin(
      pinValue,
      salt
    );

  await setDoc(
    pinRef,
    {
      hash: hash,
      salt: salt,

      // New PIN protection is ON.
      enabled: true,

      updatedAt:
        serverTimestamp(),
    }
  );

  return true;
}

/* =========================================================
   VERIFY PIN
   ========================================================= */

export async function verifyPin(pin) {
  const pinValue = String(pin);

  if (!isValidPin(pinValue)) {
    return false;
  }

  const pinRef =
    getPinDocumentReference();

  const snapshot =
    await getDoc(pinRef);

  if (!snapshot.exists()) {
    return false;
  }

  const data =
    snapshot.data();

  if (
    !data.hash ||
    !data.salt
  ) {
    return false;
  }

  const enteredHash =
    await hashPin(
      pinValue,
      data.salt
    );

  return (
    enteredHash === data.hash
  );
}

/* =========================================================
   CHANGE PIN
   ========================================================= */

export async function changePin(
  currentPin,
  newPin
) {
  const currentPinValue =
    String(currentPin);

  const newPinValue =
    String(newPin);

  if (
    !isValidPin(
      currentPinValue
    )
  ) {
    throw new Error(
      "Current PIN must be exactly 4 digits."
    );
  }

  if (
    !isValidPin(newPinValue)
  ) {
    throw new Error(
      "New PIN must be exactly 4 digits."
    );
  }

  const pinRef =
    getPinDocumentReference();

  const snapshot =
    await getDoc(pinRef);

  if (!snapshot.exists()) {
    throw new Error(
      "No PIN has been created yet."
    );
  }

  const data =
    snapshot.data();

  if (
    !data.hash ||
    !data.salt
  ) {
    throw new Error(
      "PIN data is invalid."
    );
  }

  /* Verify current PIN */

  const currentHash =
    await hashPin(
      currentPinValue,
      data.salt
    );

  if (
    currentHash !== data.hash
  ) {
    throw new Error(
      "Current PIN is incorrect."
    );
  }

  /* Generate new salt */

  const newSalt =
    generateSalt();

  /* Generate new hash */

  const newHash =
    await hashPin(
      newPinValue,
      newSalt
    );

  /*
   * merge: true preserves
   * the current ON/OFF state.
   */

  await setDoc(
    pinRef,
    {
      hash: newHash,
      salt: newSalt,
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return true;
}

/* =========================================================
   RESET PIN
   ========================================================= */

export async function resetPin(pin) {
  const pinValue = String(pin);

  if (!isValidPin(pinValue)) {
    throw new Error(
      "PIN must be exactly 4 digits."
    );
  }

  const pinRef =
    getPinDocumentReference();

  const existing =
    await getDoc(pinRef);

  const salt =
    generateSalt();

  const hash =
    await hashPin(
      pinValue,
      salt
    );

  const pinData = {
    hash: hash,
    salt: salt,
    updatedAt:
      serverTimestamp(),
  };

  /*
   * New PIN = ON.
   *
   * Existing PIN = preserve
   * current ON/OFF state.
   */

  if (!existing.exists()) {
    pinData.enabled = true;
  }

  await setDoc(
    pinRef,
    pinData,
    {
      merge: true,
    }
  );

  return true;
}

/* =========================================================
   ENABLE / DISABLE PIN PROTECTION
   ========================================================= */

export async function setPinEnabled(
  enabled
) {
  const pinRef =
    getPinDocumentReference();

  const snapshot =
    await getDoc(pinRef);

  if (!snapshot.exists()) {
    throw new Error(
      "Create a PIN before enabling PIN protection."
    );
  }

  const data =
    snapshot.data();

  if (
    !data.hash ||
    !data.salt
  ) {
    throw new Error(
      "PIN data is invalid."
    );
  }

  const newState =
    Boolean(enabled);

  await setDoc(
    pinRef,
    {
      enabled: newState,
      updatedAt:
        serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return newState;
}

/* =========================================================
   REMOVE PIN
   ========================================================= */

export async function removePin() {
  const pinRef =
    getPinDocumentReference();

  await deleteDoc(pinRef);

  return true;
}

