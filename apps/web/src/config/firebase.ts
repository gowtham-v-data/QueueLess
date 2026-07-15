import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string
};

let firebaseApp: ReturnType<typeof initializeApp> | null = null;
let firebaseAuth: Auth | null = null;
let db: Firestore | null = null;

try {
  firebaseApp  = initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);

  // Use initializeFirestore with persistent local cache (modern API, no deprecation warning)
  // Firestore will serve cached data instantly while syncing with the server in background.
  // We use persistentMultipleTabManager to prevent multi-tab locks when viewing dashboard/counters/displays.
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

export { firebaseApp, firebaseAuth, db };

export const firebaseAnalyticsPromise = firebaseApp
  ? isSupported().then((supported) => {
      if (!supported || !firebaseConfig.measurementId) return null;
      return getAnalytics(firebaseApp!);
    })
  : Promise.resolve(null);