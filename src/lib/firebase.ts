
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore, enableMultiTabIndexedDbPersistence } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";
import firebaseConfig from '../config/firebase-config';

// // Construct Firebase configuration from environment variables
// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
//   measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
// };

// Define which keys are absolutely required for the app to function
const requiredConfigKeys: (keyof Omit<typeof firebaseConfig, 'measurementId'>)[] = [
  'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
];

// Check if all *required* Firebase config values are present
const allRequiredConfigValuesPresent = requiredConfigKeys.every(key => !!firebaseConfig[key]);

let app: FirebaseApp;
let db: Firestore = {} as Firestore; // Initialize with a dummy object
let auth: Auth = {} as Auth;     // Initialize with a dummy object
let analytics: Analytics | undefined;

if (getApps().length === 0) {
  if (allRequiredConfigValuesPresent) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (error: any) {
      const criticalErrorMsg = "CRITICAL: Firebase initializeApp failed unexpectedly. This can happen if config values are present but malformed (e.g., wrong format, typos). Double-check your Firebase config values from the Firebase Console. Error: " + error.message;
      console.error(criticalErrorMsg);
      throw new Error(criticalErrorMsg); // Halt execution
    }
  } else {
    const errorMessage =
      "CRITICAL: Firebase config is missing. At least one NEXT_PUBLIC_FIREBASE_ environment variable was not found. " +
      "Please CHECK THE SUBSEQUENT LINES IN YOUR BROWSER CONSOLE for a 'DEBUG' section detailing exactly WHICH variable(s) are 'MISSING'. " +
      "Ensure these are correctly set in your .env.local file (in the project root) " +
      "and that the Next.js development server has been RESTARTED after any changes to .env.local.";
    console.error(errorMessage);
    console.log("--- DEBUG: Firebase Environment Variable Status from firebaseConfig object ---");
    console.log(`APIKEY: ${firebaseConfig.apiKey ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`AUTHDOMAIN: ${firebaseConfig.authDomain ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`PROJECTID: ${firebaseConfig.projectId ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`STORAGEBUCKET: ${firebaseConfig.storageBucket ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`MESSAGINGSENDERID: ${firebaseConfig.messagingSenderId ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`APPID: ${firebaseConfig.appId ? 'FOUND' : 'MISSING (REQUIRED)'}`);
    console.log(`MEASUREMENTID: ${firebaseConfig.measurementId ? 'FOUND' : 'MISSING (Optional)'}`);
    console.log("----------------------------------------------------------------------");
    throw new Error(errorMessage); // Halt execution
  }
} else {
  app = getApps()[0];
  if (!(app.options && requiredConfigKeys.every(key => !!app.options[key as keyof typeof app.options]))) {
     console.warn(
      "WARNING: Firebase app was already initialized, but it seems to be missing critical config. " +
      "This could indicate an issue with how it was first initialized or if environment variables changed without a full restart. " +
      "Ensure environment variables are correctly set in .env.local and dev server restarted."
    );
  }
}

if (app && app.options && app.options.apiKey) {
    try {
      db = getFirestore(app);
    } catch (error: any) {
      const dbErrorMessage = "CRITICAL: Failed to initialize Firestore. Ensure Firestore is enabled in your Firebase project console and that your project/database permissions are correct. Error: " + error.message;
      console.error(dbErrorMessage);
      // db remains the dummy object; app might still proceed if other services are usable
    }

    try {
      auth = getAuth(app);
    } catch (error: any) {
      const authErrorMessage = "CRITICAL: Failed to initialize Firebase Auth. Ensure Authentication is enabled in your Firebase project console and the necessary sign-in methods are configured. Error: " + error.message;
      console.error(authErrorMessage);
      // auth remains the dummy object
    }

    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported && firebaseConfig.measurementId) {
          try {
            analytics = getAnalytics(app);
          } catch (e: any) {
            console.warn("Firebase Analytics could not be initialized. Ensure Measurement ID is correct and Analytics is enabled. Error: " + e.message);
          }
        }
      }).catch(error => {
        console.warn("Error checking Firebase Analytics support:", error);
      });

      const isRealFirestore = db && typeof (db as any).settings === 'object' && typeof (db as any).collection === 'function';
      if (isRealFirestore) {
        enableMultiTabIndexedDbPersistence(db)
          .then(() => {
            // console.log("Firebase offline persistence enabled successfully.");
          })
          .catch((err) => {
            if (err.code === 'failed-precondition') {
              // console.warn("Firebase offline persistence failed: Multiple tabs open, or other precondition not met.");
            } else if (err.code === 'unimplemented') {
              // console.warn("Firebase offline persistence failed: The current browser does not support all of the features required.");
            } else {
              // console.error("Firebase offline persistence failed with error: ", err);
            }
          });
      } else if (Object.keys(db).length === 0) { 
        // console.warn("Firestore object does not appear to be a valid instance (likely due to earlier init failure), skipping offline persistence setup.");
      }
    }
} else if (!allRequiredConfigValuesPresent) {
    // This case is now handled by the throw new Error in the initial `if (getApps().length === 0)` block.
    // However, as a fallback for unforeseen paths:
    const appInvalidError =
        "CRITICAL: Firebase app object is invalid or was not initialized, likely due to missing configuration that wasn't caught by the primary check. " +
        "This indicates a serious issue with Firebase setup. " +
        "Ensure required environment variables are set and the server was restarted.";
    console.error(appInvalidError);
    // Not throwing here if the primary throw was missed, to avoid masking it, but this state is bad.
}


export { app, db, auth, analytics };
