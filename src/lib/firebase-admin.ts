import { initializeApp, getApps, cert, type AppOptions } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("FIREBASE_SERVICE_ACCOUNT_B64 environment variable is not set");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf-8"));
}

function getFirebaseAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert(getServiceAccount()),
  } as AppOptions);
}

export function getAdminAuth(): Auth | null {
  try {
    return getAuth(getFirebaseAdminApp());
  } catch {
    return null;
  }
}

export function getAdminDb(): Firestore | null {
  try {
    return getFirestore(getFirebaseAdminApp());
  } catch {
    return null;
  }
}
