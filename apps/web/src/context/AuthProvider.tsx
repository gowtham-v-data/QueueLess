import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  type AuthError,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Api, { setAuthToken } from '../services/api';
import { firebaseAuth, firebaseAnalyticsPromise, db } from '../config/firebase';

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone?: string;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: { firstName: string; lastName: string; email: string; password: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PROFILE_CACHE_KEY = 'ql_user_profile';

/** Build a local profile from the FirebaseUser when both API and Firestore are unavailable */
const buildOfflineProfile = (firebaseUser: FirebaseUser): User => ({
  id: firebaseUser.uid,
  firstName: firebaseUser.displayName?.split(' ')[0] ?? 'User',
  lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'QueueLess',
  email: firebaseUser.email ?? '',
  role: 'CUSTOMER'
});

/** Try to load a cached profile from sessionStorage for instant hydration */
const getCachedProfile = (): User | null => {
  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (cached) return JSON.parse(cached) as User;
  } catch { /* ignore parse errors */ }
  return null;
};

const setCachedProfile = (profile: User | null) => {
  try {
    if (profile) {
      sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    } else {
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
    }
  } catch { /* ignore storage errors */ }
};

const fetchMe = async (firebaseUser?: FirebaseUser | null): Promise<User | null> => {
  if (!firebaseUser) {
    setCachedProfile(null);
    return null;
  }

  // Return cached profile immediately if uid matches
  const cached = getCachedProfile();
  if (cached && cached.id === firebaseUser.uid) {
    // Fire-and-forget: refresh token in background
    firebaseUser.getIdToken(false).then(token => setAuthToken(token)).catch(() => {});
    return cached;
  }

  // Set auth token (non-blocking, uses cached token)
  try {
    const token = await firebaseUser.getIdToken(false);
    setAuthToken(token);
  } catch (tokenErr) {
    console.warn('Failed to get Firebase ID token:', tokenErr);
    const offline = buildOfflineProfile(firebaseUser);
    setCachedProfile(offline);
    return offline;
  }

  // Go directly to Firestore — no API call needed since both read from the same users collection
  if (db) {
    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const d = docSnap.data();
        const fsProfile: User = {
          id: firebaseUser.uid,
          firstName: String(d.firstName ?? 'User'),
          lastName: String(d.lastName ?? 'QueueLess'),
          email: firebaseUser.email ?? '',
          role: String(d.role ?? 'CUSTOMER'),
          phone: d.phone ? String(d.phone) : undefined
        };
        setCachedProfile(fsProfile);
        return fsProfile;
      } else {
        // First-time user — create their Firestore profile
        const firstName = firebaseUser.displayName?.split(' ')[0] ?? 'User';
        const lastName = firebaseUser.displayName?.split(' ').slice(1).join(' ') || 'QueueLess';
        const initialUser = {
          firstName,
          lastName,
          role: 'CUSTOMER',
          createdAt: new Date()
        };
        await setDoc(docRef, initialUser);
        const profile: User = {
          id: firebaseUser.uid,
          firstName,
          lastName,
          email: firebaseUser.email ?? '',
          role: 'CUSTOMER'
        };
        setCachedProfile(profile);
        return profile;
      }
    } catch (fsError) {
      console.warn('Firestore profile fetch failed, using offline profile:', fsError);
    }
  }

  // Fallback — never leave the user as null after successful auth
  const offline = buildOfflineProfile(firebaseUser);
  setCachedProfile(offline);
  return offline;
};

// Initialize from session cache for instant hydration (no spinner on same-session navigation)
const initialCachedUser = getCachedProfile();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(initialCachedUser);
  const [loading, setLoading] = useState(!initialCachedUser);

  // Flag to prevent onAuthStateChanged from overwriting state
  // while login() or register() are in progress
  const manualAuthInProgress = useRef(false);

  useEffect(() => {
    void firebaseAnalyticsPromise;

    if (!firebaseAuth) {
      console.warn('Firebase Auth is not initialized. Check your Firebase config.');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      // Skip if login/register is handling state directly
      if (manualAuthInProgress.current) {
        return;
      }

      try {
        if (!firebaseUser) {
          setAuthToken(null);
          setCachedProfile(null);
          setUser(null);
          return;
        }

        const profile = await fetchMe(firebaseUser);
        setUser(profile);
      } catch (err) {
        console.error('onAuthStateChanged profile fetch failed:', err);
        // Even if fetchMe throws, set an offline profile so user isn't stuck
        if (firebaseUser) {
          setUser(buildOfflineProfile(firebaseUser));
        }
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error('Firebase Auth is not initialized.');
    manualAuthInProgress.current = true;
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const profile = await fetchMe(credential.user);
      if (!profile) throw new Error('User profile not found.');
      setUser(profile);
      return profile;
    } catch (error) {
      throw new Error(formatAuthError(error));
    } finally {
      setLoading(false);
      manualAuthInProgress.current = false;
    }
  };

  const register = async (payload: { firstName: string; lastName: string; email: string; password: string; role?: string }) => {
    if (!firebaseAuth) throw new Error('Firebase Auth is not initialized.');
    manualAuthInProgress.current = true;
    setLoading(true);
    try {
      const displayName = `${payload.firstName} ${payload.lastName}`.trim();
      const credential = await createUserWithEmailAndPassword(firebaseAuth, payload.email, payload.password);
      await updateProfile(credential.user, { displayName });

      // Build profile locally — no need to call backend API during registration
      // since we already have all the user data from the payload
      const profile: User = {
        id: credential.user.uid,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        role: payload.role || 'CUSTOMER'
      };
      setUser(profile);

      // Set auth token for subsequent API calls
      try {
        const token = await credential.user.getIdToken();
        setAuthToken(token);
      } catch {
        // Non-fatal: token will be set on next auth state change
      }

      // Fire-and-forget: write profile to Firestore & send verification email
      // These run in the background and don't block the user from proceeding
      if (db) {
        const userDocRef = doc(db, 'users', credential.user.uid);
        setDoc(userDocRef, {
          firstName: payload.firstName,
          lastName: payload.lastName,
          role: payload.role || 'CUSTOMER',
          createdAt: new Date()
        }).catch((err) => console.warn('Background Firestore write failed:', err));
      }
      sendEmailVerification(credential.user).catch((err) =>
        console.warn('Email verification send failed:', err)
      );
    } catch (error) {
      throw new Error(formatAuthError(error));
    } finally {
      setLoading(false);
      manualAuthInProgress.current = false;
    }
  };

  const logout = async () => {
    if (!firebaseAuth) throw new Error('Firebase Auth is not initialized.');
    await signOut(firebaseAuth);
    setAuthToken(null);
    setCachedProfile(null);
    setUser(null);
  };

  const refresh = async () => {
    if (!firebaseAuth) throw new Error('Firebase Auth is not initialized.');
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const profile = await fetchMe(currentUser);
    setUser(profile);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};

const formatAuthError = (error: unknown) => {
  const authError = error as AuthError | undefined;
  if (authError?.code) {
    // Return just the code for easier matching in the UI
    switch (authError.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'invalid-credential';
      case 'auth/too-many-requests':
        return 'too-many-requests';
      case 'auth/email-already-in-use':
        return 'email-already-in-use';
      case 'auth/weak-password':
        return 'weak-password';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/invalid-email':
        return 'Invalid email address format.';
      default:
        return authError.code;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};