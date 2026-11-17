import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Automatically use local mode when Firebase is not configured.
export const firebaseConfigured =
  Object.values(config).every(Boolean);

const app = firebaseConfigured
  ? initializeApp(config)
  : null;

export const db = app ? getFirestore(app) : null;
