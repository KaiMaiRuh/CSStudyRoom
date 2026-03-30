/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, increment, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const { auth } = getFirebaseServices();
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);

      // Avoid a brief "Not authorized" flash on routes that depend on profile role
      // by marking the profile as loading immediately when a user is present.
      if (nextUser?.uid) {
        setProfile(null);
        setProfileLoading(true);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Subscribe to the signed-in user's profile doc
  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    if (!user?.uid) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', user.uid);

    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setProfile(data);
        setProfileLoading(false);
        if (data && data.banned) {
          const { auth } = getFirebaseServices();
          firebaseSignOut(auth).catch((e) => {
            console.error('Failed to sign out banned user', e);
          });
        }
      },
      (err) => {
        console.error('Failed to subscribe user profile', err);
        setProfile(null);
        setProfileLoading(false);
      }
    );
  }, [user?.uid]);

  const api = useMemo(() => {
    const notConfiguredError = () =>
      new Error('Firebase is not configured. Add .env.local (see .env.example).');

    async function signIn(email, password) {
      if (!isFirebaseConfigured()) throw notConfiguredError();
      const { auth } = getFirebaseServices();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      try {
        const { db } = getFirebaseServices();
        // update today's visit doc with lastSignIn and lastSeen
        try {
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;
          const visitRef = doc(db, `users/${cred.user.uid}/visits`, key);
          await setDoc(
            visitRef,
            {
              count: increment(1),
              date: serverTimestamp(),
              lastSignIn: serverTimestamp(),
              lastSeen: serverTimestamp(),
              signInCount: increment(1),
            },
            { merge: true }
          );
        } catch (e) {
          console.error('Failed To Update Visit On Log In', e);
        }
      } catch (err) {
        console.error('Failed To Log Log In Activity', err);
      }

      // Check if the user's account is banned. If so, sign them out immediately.
      try {
        const { db } = getFirebaseServices();
        const userRef = doc(db, 'users', cred.user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data()?.banned) {
          const { auth } = getFirebaseServices();
          await firebaseSignOut(auth);
          const bannedError = new Error('This account has been banned');
          bannedError.code = 'auth/banned';
          throw bannedError;
        }
      } catch (checkErr) {
        if (checkErr?.code === 'auth/banned') {
          throw checkErr;
        }
        console.error('Failed to check ban status after sign in', checkErr);
      }
      return cred.user;
    }

    async function signUp({ email, password, fullName, username, year }) {
      if (!isFirebaseConfigured()) throw notConfiguredError();
      const { auth, db } = getFirebaseServices();

      const normalizedEmail = String(email || '').trim();
      const normalizedEmailLower = normalizedEmail.toLowerCase();

      if (!normalizedEmailLower) {
        throw new Error('Email is required');
      }

      // Whitelist check: allowedEmails/{email}
      // The user created allowedEmails collection with Document ID equal to email.
      // We try exact match first, then lowercased (recommended) to avoid case issues.
      // Whitelist check: allowedEmails/{email}
      // The user created allowedEmails collection with Document ID equal to email.
      // We try exact match first, then lowercased (recommended) to avoid case issues.
      try {
        const exactRef = doc(db, 'allowedEmails', normalizedEmail);
        const lowerRef = normalizedEmailLower !== normalizedEmail ? doc(db, 'allowedEmails', normalizedEmailLower) : null;

        const exactSnap = await getDoc(exactRef);
        const lowerSnap = lowerRef ? await getDoc(lowerRef) : null;
        const allowed = exactSnap.exists() || Boolean(lowerSnap?.exists());

        if (!allowed) {
          throw new Error('This email is not authorized to sign up');
        }
      } catch (err) {
        // If the error is "not allowed", keep it.
        if (err?.message === 'This email is not authorized to sign up') {
          throw err;
        }
        // Otherwise (network / permission / etc.), fail safely with a friendly message.
        throw new Error('Unable to verify email authorization. Please try again');
      }

      const cred = await createUserWithEmailAndPassword(auth, normalizedEmailLower, password);

      const displayName = fullName || username || '';
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName,
          username: username || null,
          year: year || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return cred.user;
    }

    async function signOut() {
      if (!isFirebaseConfigured()) return;
      const { auth } = getFirebaseServices();
      await firebaseSignOut(auth);
    }

    async function resetPassword(email) {
      if (!isFirebaseConfigured()) throw notConfiguredError();
      const { auth } = getFirebaseServices();
      await sendPasswordResetEmail(auth, email);
    }

    async function logActivity(type, meta = {}) {
      if (!isFirebaseConfigured()) return;
      try {
        const { db } = getFirebaseServices();
        const uid = user?.uid;
        if (!uid) return;
        // Compact storage: keep per-day counters in users/{uid}/visits/{YYYY-MM-DD}
        // (no per-event activity documents).
        if (type !== 'page_view') return;

        try {
          const d = new Date();
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;
          const hourField = `hours.h${hh}`;

          const visitRef = doc(db, `users/${uid}/visits`, key);
          const lastPage = meta?.page ?? null;
          await setDoc(
            visitRef,
            {
              count: increment(1),
              date: serverTimestamp(),
              lastPage,
              lastSeen: serverTimestamp(),
              pageViewCount: increment(1),
              [hourField]: increment(1),
            },
            { merge: true }
          );
        } catch (err) {
          console.error('Failed to Increment Daily Visit Counter', err);
        }
      } catch (err) {
          console.error('Failed to Log Activity', err);
      }
    }

    const role = profile?.role || null;
    const isAdmin = String(role || '').toLowerCase() === 'admin';

    return {
      user,
      loading,
      profile,
      profileLoading,
      role,
      isAdmin,
      signIn,
      signUp,
      signOut,
      resetPassword,
      logActivity,
    };
  }, [user, loading, profile, profileLoading]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
