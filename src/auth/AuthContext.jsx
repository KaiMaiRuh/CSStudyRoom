import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
    });

    return () => unsub();
  }, []);

  const api = useMemo(() => {
    const notConfiguredError = () =>
      new Error('Firebase is not configured. Add .env.local (see .env.example).');

    async function signIn(email, password) {
      if (!isFirebaseConfigured()) throw notConfiguredError();
      const { auth } = getFirebaseServices();
      const cred = await signInWithEmailAndPassword(auth, email, password);
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
      try {
        const exactRef = doc(db, 'allowedEmails', normalizedEmail);
        const lowerRef = normalizedEmailLower !== normalizedEmail ? doc(db, 'allowedEmails', normalizedEmailLower) : null;

        const exactSnap = await getDoc(exactRef);
        const lowerSnap = lowerRef ? await getDoc(lowerRef) : null;
        const allowed = exactSnap.exists() || Boolean(lowerSnap?.exists());

        if (!allowed) {
          throw new Error('อีเมลนี้ไม่ได้รับสิทธิ์ให้สมัครสมาชิก');
        }
      } catch (err) {
        // If the error is "not allowed", keep it.
        if (err?.message === 'อีเมลนี้ไม่ได้รับสิทธิ์ให้สมัครสมาชิก') {
          throw err;
        }
        // Otherwise (network / permission / etc.), fail safely with a friendly message.
        throw new Error('ไม่สามารถตรวจสอบสิทธิ์อีเมลได้ กรุณาลองใหม่');
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

    return { user, loading, signIn, signUp, signOut, resetPassword };
  }, [user, loading]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
