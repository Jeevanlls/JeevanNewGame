
// Use namespace import to resolve "no exported member" errors in certain build environments
import * as firebaseApp from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Helper to get environment variables from different possible sources (Vite, Process, etc.)
const getEnv = (key: string) => {
  const value = process.env[key] || (import.meta as any).env?.[`VITE_${key}`] || (import.meta as any).env?.[key];
  return (value === "undefined" || value === "null" || !value) ? undefined : value;
};

const firebaseConfig = {
  apiKey: getEnv("FIREBASE_API_KEY") || getEnv("API_KEY"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID") || getEnv("PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID")
};

// Only initialize if we have at least a project ID. 
let db: any = null;

if (firebaseConfig.projectId) {
  try {
    // Check if there are already initialized apps to avoid the "Firebase: App named '[DEFAULT]' already exists" error during HMR
    const apps = firebaseApp.getApps();
    const app = apps.length === 0 ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.getApp();
    db = getFirestore(app);
    
    // Enable offline persistence for better user experience in flaky network conditions
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn("Firebase persistence failed: multiple tabs open.");
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firebase persistence not supported by browser.");
      }
    });
  } catch (e) {
    console.error("Firebase Initialization Failed:", e);
  }
} else {
  console.warn("Firebase Project ID is missing. App is running in local-only mode.");
}

export { db };
