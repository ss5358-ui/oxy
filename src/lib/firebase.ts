
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

// INSTRUCTIONS FOR SETTING UP FIREBASE (if not using hardcoded values below):
// 1. Create a .env.local file in the root of your project.
// 2. Add your Firebase project configuration values to this file, like so:
//    NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
//    NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
//    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
//    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
//    NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
//    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="YOUR_MEASUREMENT_ID" (optional)
// 3. Replace "YOUR_..." with the actual values from your Firebase project settings.
// 4. Ensure you have enabled Email/Password sign-in in Firebase Authentication and set up Firestore database in the Firebase console.

// Using hardcoded Firebase configuration as provided by the user.
// For production, it's recommended to use environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyBIsKcCO9N95VTn1LHlK3HpMBPJ0NzHIME",
  authDomain: "oxylink-a41fb.firebaseapp.com",
  projectId: "oxylink-a41fb",
  storageBucket: "oxylink-a41fb.firebasestorage.app", // Note: Usually projectID.appspot.com, using provided value.
  messagingSenderId: "172300000484",
  appId: "1:172300000484:web:291fc79ca85984f470e0f1",
  measurementId: "G-HPK4NFG82W"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let analytics: Analytics | undefined;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    // Check if essential config values are present (they should be if hardcoded correctly)
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId
    ) {
      console.error(
        'Firebase configuration values are missing. Please check the hardcoded firebaseConfig object in src/lib/firebase.ts or ensure environment variables are set if using them.'
      );
      // You could throw an error here or render a message to the user
      // For now, to prevent further errors, we might not initialize if config is bad.
    }
    
    // Initialize Firebase only if essential config values are present
    if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        isSupported().then((supported) => {
        if (supported) {
            analytics = getAnalytics(app);
        }
        });
    } else {
        // Handle the case where Firebase cannot be initialized
        // This state should ideally be reflected in the UI
        console.error("Firebase could not be initialized due to missing configuration.");
    }

  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isSupported().then((supported) => {
      if (supported && !analytics) { // Initialize only if supported and not already initialized
        analytics = getAnalytics(app);
      }
    });
  }
}

// @ts-ignore - Exporting potentially uninitialized vars for server builds, client will have them if init is successful.
export { app, auth, db, storage, analytics };
