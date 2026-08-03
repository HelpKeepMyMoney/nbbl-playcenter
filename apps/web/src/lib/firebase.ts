import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let emulatorsConnected = false;

export function getFirebaseApp() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }

  if (
    process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
    typeof window !== "undefined" &&
    !emulatorsConnected
  ) {
    connectAuthEmulator(getAuth(app), "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(getFirestore(app), "127.0.0.1", 8080);
    connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5001);
    connectStorageEmulator(getStorage(app), "127.0.0.1", 9199);
    emulatorsConnected = true;
  }

  return app;
}

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

export function getClientDb() {
  return getFirestore(getFirebaseApp());
}

export function getClientFunctions() {
  return getFunctions(getFirebaseApp());
}
