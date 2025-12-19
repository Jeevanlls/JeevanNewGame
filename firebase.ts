
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * AJ'S CLOUD ENGINE
 * Using the verified credentials for: ai-party-game-45d1f
 */
const firebaseConfig = {
  apiKey: "AIzaSyB2CiXe8E6XNKfngKLAnzNqmQsE141j8Qs",
  authDomain: "ai-party-game-45d1f.firebaseapp.com",
  projectId: "ai-party-game-45d1f",
  storageBucket: "ai-party-game-45d1f.firebasestorage.app",
  messagingSenderId: "18989933938",
  appId: "1:18989933938:web:6b3bce7c1105bc5f4469eb"
};

let db: any = null;

try {
  const apps = getApps();
  const app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  
  // Enable offline persistence so players don't drop out on 4G/5G blips
  enableIndexedDbPersistence(db).catch((err) => {
    console.warn("Firestore Persistence Notice:", err.code);
  });
  
  console.log("Mind Mash Cloud Engine: ONLINE (Project: ai-party-game-45d1f)");
} catch (e) {
  console.error("CRITICAL: Firebase Cloud Sync Failed:", e);
}

export { db };
