import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";

import { auth } from "./auth";
import app from "./firebaseConfig";

const db = getFirestore(app);

const getUserId = () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in.");
  }

  return user.uid;
};

const getUserCollection = (collectionName) => {
  const userId = getUserId();

  return collection(
    db,
    "users",
    userId,
    collectionName
  );
};


/* =========================================================
   SAVE ONE ITEM
========================================================= */

export const saveItemToFirestore = async (
  collectionName,
  itemId,
  data
) => {
  const userId = getUserId();

  const itemRef = doc(
    db,
    "users",
    userId,
    collectionName,
    String(itemId)
  );

  await setDoc(
    itemRef,
    data,
    {
      merge: true,
    }
  );
};


/* =========================================================
   GET ALL ITEMS
========================================================= */

export const getItemsFromFirestore = async (
  collectionName
) => {
  const collectionRef =
    getUserCollection(collectionName);

  const snapshot =
    await getDocs(collectionRef);

  return snapshot.docs.map(
    (document) => ({
      id: document.id,
      ...document.data(),
    })
  );
};


/* =========================================================
   GET ONE ITEM
========================================================= */

export const getItemFromFirestore = async (
  collectionName,
  itemId
) => {
  const userId = getUserId();

  const itemRef = doc(
    db,
    "users",
    userId,
    collectionName,
    String(itemId)
  );

  const snapshot =
    await getDoc(itemRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};


/* =========================================================
   DELETE ONE ITEM
========================================================= */

export const deleteItemFromFirestore = async (
  collectionName,
  itemId
) => {
  const userId = getUserId();

  const itemRef = doc(
    db,
    "users",
    userId,
    collectionName,
    String(itemId)
  );

  await deleteDoc(itemRef);
};


/* =========================================================
   SAVE MULTIPLE ITEMS
========================================================= */

export const saveItemsToFirestore = async (
  collectionName,
  items
) => {
  for (const item of items) {
    if (!item?.id) {
      continue;
    }

    await saveItemToFirestore(
      collectionName,
      item.id,
      item
    );
  }
};


/* =========================================================
   REAL-TIME LISTENER
========================================================= */

export const subscribeToFirestoreCollection = (
  collectionName,
  callback,
  onError
) => {
  const collectionRef =
    getUserCollection(collectionName);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const items = snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data(),
        })
      );

      callback(items);
    },
    (error) => {
      console.error(
        `Firestore listener failed for ${collectionName}:`,
        error
      );

      if (onError) {
        onError(error);
      }
    }
  );
};


export { db };