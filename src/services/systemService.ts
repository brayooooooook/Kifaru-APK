import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function getSystemData() {
  const ref = doc(db, "system", "main");

  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data();
  }

  return null;
}
