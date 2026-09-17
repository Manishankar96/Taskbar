// src/firebase/sync.js

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { auth } from "./auth";
import { db } from "./firestore";


/* =========================================================
   TASKBAR FIRESTORE COLLECTIONS
   ========================================================= */

const SYNC_STORES = [
  "topics",
  "goals",
  "timetable",
  "diet",
  "water",
  "screenTime",
  "activities",
  "assessments",
  "quickTasks",
  "streak",
  "profile",
  "dailyReports",
  "quickNotes",
  "dailyTargets",
  "reminders",
  "todoList",
  "studySessions",

  // CAREER
  "jobPreparation",
  "applications",
  "savedJobs",
  "resumes",
  "interviews",
  "projects",

  // FINANCE
  "income",
  "expenses",
  "budget",
];


/* =========================================================
   CURRENT USER
   ========================================================= */

function getCurrentUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in.");
  }

  return user;
}


/* =========================================================
   FIRESTORE USER PATH
   ========================================================= */

function getUserCollection(storeName) {
  const user = getCurrentUser();

  return collection(
    db,
    "users",
    user.uid,
    storeName
  );
}


function getUserDocument(storeName, itemId) {
  const user = getCurrentUser();

  return doc(
    db,
    "users",
    user.uid,
    storeName,
    String(itemId)
  );
}


/* =========================================================
   FIRESTORE → APP
   ========================================================= */

/*
 * Read one complete Firestore collection.
 *
 * Firebase is the source of truth.
 * No IndexedDB/localStorage operation happens here.
 */
export async function getStoreFromFirestore(storeName) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  const collectionRef =
    getUserCollection(storeName);

  const snapshot =
    await getDocs(collectionRef);

  return snapshot.docs.map(
    (document) => ({
      id: document.id,
      ...document.data(),
    })
  );
}


/*
 * Read all TASKBAR collections from Firestore.
 */
export async function getAllStoresFromFirestore() {
  getCurrentUser();

  const data = {};

  for (const storeName of SYNC_STORES) {
    try {
      data[storeName] =
        await getStoreFromFirestore(
          storeName
        );
    } catch (error) {
      console.error(
        `❌ Failed reading ${storeName} from Firestore:`,
        error
      );

      data[storeName] = [];
    }
  }

  return data;
}


/* =========================================================
   INITIAL SYNC
   ========================================================= */

/*
 * Firebase-only initial load.
 *
 * IMPORTANT:
 * This function no longer reads from
 * or writes to IndexedDB.
 *
 * Firebase is now the source of truth.
 */
export async function initialSync(
  storeName
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  const items =
    await getStoreFromFirestore(
      storeName
    );

  console.log(
    `☁️ ${storeName} loaded from Firestore: ${items.length} items`
  );

  return items;
}


/*
 * Firebase-only initial load
 * for every TASKBAR collection.
 */
export async function syncAllFromFirestore() {
  getCurrentUser();

  console.log(
    "☁️ Loading TASKBAR data from Firestore..."
  );

  const data =
    await getAllStoresFromFirestore();

  console.log(
    "✅ TASKBAR Firestore data loaded."
  );

  return data;
}


/* =========================================================
   FIRESTORE WRITE
   ========================================================= */

/*
 * Save ONE item directly to Firestore.
 *
 * Firebase is the main database.
 * No local database write is performed.
 */
export async function syncItemToFirestore(
  storeName,
  item
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  if (
    !item ||
    item.id === undefined ||
    item.id === null
  ) {
    throw new Error(
      `A valid item.id is required for ${storeName}.`
    );
  }

  const documentRef =
    getUserDocument(
      storeName,
      item.id
    );

  await setDoc(
    documentRef,
    item,
    {
      merge: true,
    }
  );

  console.log(
    `☁️ Saved ${storeName}/${item.id} to Firestore`
  );

  return item;
}


/*
 * Save an entire collection
 * directly to Firestore.
 */
export async function syncStoreToFirestore(
  storeName,
  items = []
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  if (!Array.isArray(items)) {
    throw new Error(
      `items must be an array for ${storeName}.`
    );
  }

  for (const item of items) {
    await syncItemToFirestore(
      storeName,
      item
    );
  }

  console.log(
    `☁️ ${storeName} saved to Firestore`
  );

  return items;
}


/*
 * Save all TASKBAR data directly
 * to Firestore.
 *
 * Expected shape:
 *
 * {
 *   topics: [...],
 *   goals: [...],
 *   ...
 * }
 */
export async function syncAllToFirestore(
  data = {}
) {
  getCurrentUser();

  console.log(
    "☁️ Starting TASKBAR → Firestore save..."
  );

  for (const storeName of SYNC_STORES) {
    const items =
      data[storeName];

    if (!Array.isArray(items)) {
      continue;
    }

    try {
      await syncStoreToFirestore(
        storeName,
        items
      );
    } catch (error) {
      console.error(
        `❌ Failed saving ${storeName}:`,
        error
      );
    }
  }

  console.log(
    "✅ TASKBAR → Firestore save completed."
  );

  return data;
}


/* =========================================================
   DELETE FROM FIRESTORE
   ========================================================= */

export async function syncDeleteToFirestore(
  storeName,
  itemId
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  if (
    itemId === undefined ||
    itemId === null
  ) {
    throw new Error(
      `A valid itemId is required for ${storeName}.`
    );
  }

  const documentRef =
    getUserDocument(
      storeName,
      itemId
    );

  await deleteDoc(
    documentRef
  );

  console.log(
    `🗑️ Deleted ${storeName}/${itemId} from Firestore`
  );
}


/* =========================================================
   SAVE + SYNC ONE ITEM
   ========================================================= */

/*
 * Firebase-only save.
 *
 * Old behavior:
 *
 * IndexedDB → Firestore
 *
 * New behavior:
 *
 * Firestore only
 */
export async function saveAndSyncItem(
  storeName,
  item
) {
  return syncItemToFirestore(
    storeName,
    item
  );
}


/* =========================================================
   DELETE + SYNC ONE ITEM
   ========================================================= */

/*
 * Firebase-only delete.
 */
export async function deleteAndSyncItem(
  storeName,
  itemId
) {
  return syncDeleteToFirestore(
    storeName,
    itemId
  );
}


/* =========================================================
   REAL-TIME FIRESTORE LISTENER
   ========================================================= */

/*
 * Listen to one Firestore collection.
 *
 * IMPORTANT:
 * This listener no longer writes
 * received data into IndexedDB.
 *
 * It returns Firebase data
 * through the onData callback.
 *
 * Example:
 *
 * listenToStore(
 *   "topics",
 *   (items) => {
 *     setTopics(items);
 *   }
 * );
 */
export function listenToStore(
  storeName,
  onData
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid Firestore store: ${storeName}`
    );
  }

  if (
    onData !== undefined &&
    typeof onData !== "function"
  ) {
    throw new Error(
      "onData must be a function."
    );
  }

  const collectionRef =
    getUserCollection(
      storeName
    );

  const unsubscribe =
    onSnapshot(
      collectionRef,

      (snapshot) => {
        const items =
          snapshot.docs.map(
            (document) => ({
              id: document.id,
              ...document.data(),
            })
          );

        console.log(
          `🔄 Firestore real-time update: ${storeName}`
        );

        if (onData) {
          onData(items);
        }
      },

      (error) => {
        console.error(
          `❌ Firestore listener error for ${storeName}:`,
          error
        );
      }
    );

  return unsubscribe;
}


/* =========================================================
   LISTEN TO ALL STORES
   ========================================================= */

/*
 * Start Firebase real-time listeners.
 *
 * onData receives:
 *
 * {
 *   storeName,
 *   items
 * }
 *
 * Nothing is written to IndexedDB.
 */
export function startRealtimeSync(
  onData
) {
  getCurrentUser();

  if (
    onData !== undefined &&
    typeof onData !== "function"
  ) {
    throw new Error(
      "onData must be a function."
    );
  }

  const unsubscribeFunctions = [];

  for (const storeName of SYNC_STORES) {
    try {
      const unsubscribe =
        listenToStore(
          storeName,
          (items) => {
            if (onData) {
              onData({
                storeName,
                items,
              });
            }
          }
        );

      unsubscribeFunctions.push(
        unsubscribe
      );
    } catch (error) {
      console.error(
        `❌ Could not listen to ${storeName}:`,
        error
      );
    }
  }

  console.log(
    "👂 Firebase real-time sync started."
  );

  return () => {
    unsubscribeFunctions.forEach(
      (unsubscribe) => {
        try {
          unsubscribe();
        } catch (error) {
          console.error(
            "❌ Failed to unsubscribe:",
            error
          );
        }
      }
    );

    console.log(
      "🛑 Firebase real-time sync stopped."
    );
  };
}


/* =========================================================
   EXPORTS
   ========================================================= */

export {
  SYNC_STORES,
};