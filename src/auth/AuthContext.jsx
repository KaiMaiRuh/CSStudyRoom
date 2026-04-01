/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../api/firebaseConfig.js';
import {
  logActivity as logActivityService,
  resetPasswordForEmail,
  signInUser,
  signOutUser,
  signUpUser,
} from '../api/authService.js';

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
          signOutUser().catch((e) => {
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
    const role = profile?.role || null;
    const isAdmin = String(role || '').toLowerCase() === 'admin';

    return {
      user,
      loading,
      profile,
      profileLoading,
      role,
      isAdmin,
      signIn: (email, password) => signInUser(email, password),
      signUp: (payload) => signUpUser(payload),
      signOut: () => signOutUser(),
      resetPassword: (email) => resetPasswordForEmail(email),
      logActivity: (type, meta = {}) => logActivityService({ uid: user?.uid, type, meta }),
    };
  }, [user, loading, profile, profileLoading]);

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
