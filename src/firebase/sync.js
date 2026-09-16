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

import {
  getItems,
  saveItems,
  putItem,
  deleteItem,
} from "../utils/db";


/* =========================================================
   TASKBAR STORES
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
   LOCAL → FIRESTORE
   ========================================================= */

/*
 * Upload one IndexedDB item to Firestore.
 */
export async function syncItemToFirestore(
  storeName,
  item
) {
  if (
    !item ||
    item.id === undefined ||
    item.id === null
  ) {
    return;
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
}


/*
 * Upload one complete IndexedDB store
 * to Firestore.
 */
export async function syncStoreToFirestore(
  storeName
) {
  const items =
    await getItems(storeName);

  for (const item of items) {
    await syncItemToFirestore(
      storeName,
      item
    );
  }

  console.log(
    `☁️ ${storeName} synced to Firestore`
  );
}


/*
 * Upload all Taskbar stores.
 *
 * We will use this later.
 */
export async function syncAllToFirestore() {
  getCurrentUser();

  console.log(
    "☁️ Starting IndexedDB → Firestore sync..."
  );

  for (const storeName of SYNC_STORES) {
    try {
      await syncStoreToFirestore(
        storeName
      );
    } catch (error) {
      console.error(
        `❌ Failed syncing ${storeName}:`,
        error
      );
    }
  }

  console.log(
    "✅ IndexedDB → Firestore sync completed."
  );
}


/* =========================================================
   FIRESTORE → LOCAL
   ========================================================= */

/*
 * Download one Firestore collection
 * into IndexedDB.
 */
export async function syncStoreFromFirestore(
  storeName
) {
  const collectionRef =
    getUserCollection(storeName);

  const snapshot =
    await getDocs(collectionRef);

  const items =
    snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );

  await saveItems(
    storeName,
    items
  );

  console.log(
    `📥 ${storeName} downloaded from Firestore`
  );

  return items;
}


/*
 * Download all Taskbar stores.
 *
 * We will use this later.
 */
export async function syncAllFromFirestore() {
  getCurrentUser();

  console.log(
    "📥 Starting Firestore → IndexedDB sync..."
  );

  for (const storeName of SYNC_STORES) {
    try {
      await syncStoreFromFirestore(
        storeName
      );
    } catch (error) {
      console.error(
        `❌ Failed downloading ${storeName}:`,
        error
      );
    }
  }

  console.log(
    "✅ Firestore → IndexedDB sync completed."
  );
}


/* =========================================================
   INITIAL SYNC
   ========================================================= */

/*
 * Initial synchronization for ONE store.
 *
 * Example:
 *
 * initialSync("quickNotes")
 *
 * This means ONLY quickNotes is touched.
 *
 * Rules:
 *
 * 1. If Firestore has data:
 *       Firestore → IndexedDB
 *
 * 2. If Firestore is empty:
 *       IndexedDB → Firestore
 *
 * This protects existing local data
 * during the first migration.
 */

/* =========================================================
   SAFE TIMESTAMP HELPER
   ========================================================= */

/*
 * Returns a comparable timestamp from an item.
 * Supports ISO date strings, numeric timestamps,
 * and Firestore Timestamp-like values.
 */
function getUpdatedAtValue(item) {
  if (!item || item.updatedAt === undefined || item.updatedAt === null) {
    return null;
  }

  const value = item.updatedAt;

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    const millis = value.toMillis();

    return Number.isFinite(millis)
      ? millis
      : null;
  }

  if (typeof value === "string") {
    const millis = Date.parse(value);

    return Number.isNaN(millis)
      ? null
      : millis;
  }

  return null;
}

export async function initialSync(
  storeName
) {
  getCurrentUser();

  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid sync store: ${storeName}`
    );
  }

  console.log(
    `🔄 Starting safe initial sync for ${storeName}...`
  );

  const collectionRef =
    getUserCollection(storeName);

  const snapshot =
    await getDocs(collectionRef);

  const localItems =
    await getItems(storeName);

  const cloudItems =
    snapshot.docs.map(
      (document) => ({
        id: document.id,
        ...document.data(),
      })
    );

  /* -----------------------------------------
     BOTH LOCAL + CLOUD DATA
     -----------------------------------------
     Do not blindly replace local data.

     Rules:
     1. Item exists only locally:
        → upload it to Firestore.

     2. Item exists only in Firestore:
        → download it to IndexedDB.

     3. Item exists in both:
        → compare updatedAt when available.
        → newer item wins.
        → if no usable updatedAt exists,
          keep the cloud version as the
          existing migration behavior.
     ----------------------------------------- */

  if (cloudItems.length > 0) {
    const localById = new Map(
      localItems.map((item) => [
        String(item.id),
        item,
      ])
    );

    const cloudById = new Map(
      cloudItems.map((item) => [
        String(item.id),
        item,
      ])
    );

    const mergedItems = [];

    // Process every item known to either side.
    const allIds = new Set([
      ...localById.keys(),
      ...cloudById.keys(),
    ]);

    for (const id of allIds) {
      const localItem = localById.get(id);
      const cloudItem = cloudById.get(id);

      // Only local → upload and keep local copy.
      if (localItem && !cloudItem) {
        try {
          await syncItemToFirestore(
            storeName,
            localItem
          );
        } catch (error) {
          console.error(
            `❌ Failed uploading local ${storeName}/${id}:`,
            error
          );
        }

        mergedItems.push(localItem);
        continue;
      }

      // Only cloud → download.
      if (!localItem && cloudItem) {
        mergedItems.push(cloudItem);
        continue;
      }

      // Exists on both sides.
      const localUpdatedAt =
        getUpdatedAtValue(localItem);

      const cloudUpdatedAt =
        getUpdatedAtValue(cloudItem);

      if (
        localUpdatedAt !== null &&
        cloudUpdatedAt !== null
      ) {
        if (localUpdatedAt > cloudUpdatedAt) {
          try {
            await syncItemToFirestore(
              storeName,
              localItem
            );
          } catch (error) {
            console.error(
              `❌ Failed uploading newer local ${storeName}/${id}:`,
              error
            );
          }

          mergedItems.push(localItem);
        } else {
          mergedItems.push(cloudItem);
        }
      } else {
        // No reliable timestamp.
        // Preserve the existing migration rule:
        // Firestore wins when cloud data exists.
        mergedItems.push(cloudItem);
      }
    }

    await saveItems(
      storeName,
      mergedItems
    );

    console.log(
      `🔄 Safe merge completed for ${storeName}`
    );

    return mergedItems;
  }

  /* -----------------------------------------
     FIRESTORE IS EMPTY
     ----------------------------------------- */

  if (localItems.length > 0) {
    for (const item of localItems) {
      try {
        await syncItemToFirestore(
          storeName,
          item
        );
      } catch (error) {
        console.error(
          `❌ Failed uploading ${storeName}:`,
          error
        );
      }
    }

    console.log(
      `💾 → ☁️ ${storeName} uploaded from local storage`
    );

    return localItems;
  }

  console.log(
    `ℹ️ ${storeName} has no local or cloud data.`
  );

  return [];
}


/* =========================================================
   REAL-TIME LISTENER
   ========================================================= */

/*
 * Listen for changes to ONE Firestore collection.
 *
 * When another device changes data:
 *
 * Device A
 *    ↓
 * Firestore
 *    ↓
 * onSnapshot()
 *    ↓
 * IndexedDB
 *    ↓
 * Device B
 */
export function listenToStore(
  storeName
) {
  if (!SYNC_STORES.includes(storeName)) {
    throw new Error(
      `Invalid sync store: ${storeName}`
    );
  }

  const collectionRef =
    getUserCollection(storeName);

  const unsubscribe =
    onSnapshot(
      collectionRef,
      async (snapshot) => {
        try {
          const items =
            snapshot.docs.map(
              (document) => ({
                id: document.id,
                ...document.data(),
              })
            );

          await saveItems(
            storeName,
            items
          );

          console.log(
            `🔄 Real-time update: ${storeName}`
          );

        } catch (error) {
          console.error(
            `❌ Real-time update failed for ${storeName}:`,
            error
          );
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
 * Start real-time listeners for all stores.
 *
 * We will use this later after the
 * quickNotes test succeeds.
 */
export function startRealtimeSync() {
  getCurrentUser();

  const unsubscribeFunctions = [];

  for (const storeName of SYNC_STORES) {
    try {
      const unsubscribe =
        listenToStore(storeName);

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
    "👂 Real-time Firestore sync started."
  );

  /*
   * Return one cleanup function.
   */
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
      "🛑 Real-time Firestore sync stopped."
    );
  };
}


/* =========================================================
   DELETE FROM FIRESTORE
   ========================================================= */

/*
 * Delete an item from Firestore.
 */
export async function syncDeleteToFirestore(
  storeName,
  itemId
) {
  if (
    itemId === undefined ||
    itemId === null
  ) {
    return;
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
 * Save locally first,
 * then upload to Firestore.
 *
 * We will connect this to db.js later.
 */
export async function saveAndSyncItem(
  storeName,
  item
) {
  if (!item) {
    throw new Error(
      "Item is required."
    );
  }

  await putItem(
    storeName,
    item
  );

  await syncItemToFirestore(
    storeName,
    item
  );

  return item;
}


/* =========================================================
   DELETE + SYNC ONE ITEM
   ========================================================= */

/*
 * Delete locally first,
 * then delete from Firestore.
 *
 * We will connect this to db.js later.
 */
export async function deleteAndSyncItem(
  storeName,
  itemId
) {
  await deleteItem(
    storeName,
    itemId
  );

  await syncDeleteToFirestore(
    storeName,
    itemId
  );
}


/* =========================================================
   EXPORTS
   ========================================================= */

export {
  SYNC_STORES,
};