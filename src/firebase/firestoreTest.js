import {
  saveItemToFirestore,
  getItemFromFirestore,
} from "./firestore";

export const testFirestore = async () => {
  try {
    const testData = {
      message: "Taskbar Firestore is working!",
      createdAt: new Date().toISOString(),
    };

    await saveItemToFirestore(
      "test",
      "connectionTest",
      testData
    );

    const result = await getItemFromFirestore(
      "test",
      "connectionTest"
    );

    console.log("🔥 Firestore Test Result:", result);

    return result;
  } catch (error) {
    console.error("❌ Firestore Test Failed:", error);
  }
};