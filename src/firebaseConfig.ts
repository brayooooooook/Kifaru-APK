// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyYnHia2us8Ow2HfywH10lQQd4mk9AqH0",
  authDomain: "arcane-monolith-bgbcx.firebaseapp.com",
  projectId: "arcane-monolith-bgbcx",
  storageBucket: "arcane-monolith-bgbcx.firebasestorage.app",
  messagingSenderId: "824929257592",
  appId: "1:824929257592:web:ee6d9ade425adf54e7058d"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
