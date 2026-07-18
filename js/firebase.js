/**
 * Firebase Client SDK Initialization
 * Loads Firebase App, Auth, Firestore, and Messaging using ES Modules from gstatic CDN.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Firebase configuration placeholder. 
// Replace these with your actual Firebase Project keys from the Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

let app;
let auth;
let db;
let messaging;

try {
  // Check if configuration has been filled in. If not, look in window environment or local storage override.
  const config = window.FIREBASE_CONFIG_OVERRIDE || firebaseConfig;
  
  const isPlaceholder = config.apiKey === "YOUR_API_KEY" || !config.apiKey;

  if (isPlaceholder) {
    console.info("%c[Firebase SDK] Running in offline/local-only mode. (Configure firebase.js with real project keys to enable Cloud Sync)", "color: #3b82f6; font-weight: bold;");
  } else {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Messaging only initialized if supported in the current context
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      messaging = getMessaging(app);
    }
  }
} catch (error) {
  console.error("Error initializing Firebase App:", error);
}

export { app, auth, db, messaging, signInAnonymously };
