import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
];

export function isFirebaseConfigured() {
  return REQUIRED_ENV_KEYS.every((key) => Boolean(import.meta.env[key]));
}

function buildFirebaseConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

let cachedServices = null;

export function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    const missing = REQUIRED_ENV_KEYS.filter((key) => !import.meta.env[key]);
    throw new Error(
      [
        'Firebase is not configured for this app.',
        `Missing env vars: ${missing.join(', ')}`,
        'Create a .env.local file (see .env.example) and restart the dev server.',
      ].join('\n')
    );
  }

  if (cachedServices) return cachedServices;

  const app = initializeApp(buildFirebaseConfig());
  const auth = getAuth(app);
  const db = getFirestore(app);

  cachedServices = { app, auth, db };
  return cachedServices;
}
