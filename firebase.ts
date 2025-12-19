import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// The error "Consumer 'projects/undefined'" indicates the projectId is missing.
// We check for various standard environment variable names to ensure connectivity.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || process.env.API_KEY || (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.PROJECT_ID || (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "mind-mash-default",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID || (import.meta as any).env?.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);