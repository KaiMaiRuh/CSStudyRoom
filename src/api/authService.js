import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from './firebaseConfig.js';

function notConfiguredError() {
  return new Error('Firebase is not configured. Add .env.local (see .env.example).');
}

async function updateVisitStats(db, uid, { signIn = false } = {}) {
  try {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const visitRef = doc(db, `users/${uid}/visits`, key);

    await setDoc(
      visitRef,
      {
        count: increment(1),
        date: serverTimestamp(),
        lastSeen: serverTimestamp(),
        ...(signIn
          ? {
              lastSignIn: serverTimestamp(),
              signInCount: increment(1),
            }
          : {
              lastPage: null,
              pageViewCount: increment(1),
            }),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Failed to update visit stats', error);
  }
}

export async function signInUser(email, password) {
  if (!isFirebaseConfigured()) throw notConfiguredError();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const { auth, db } = getFirebaseServices();
  const cred = await signInWithEmailAndPassword(auth, normalizedEmail, password);

  try {
    await updateVisitStats(db, cred.user.uid, { signIn: true });
  } catch (err) {
    console.error('Failed To Log Log In Activity', err);
  }

  try {
    const userRef = doc(db, 'users', cred.user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data()?.banned) {
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

export async function signUpUser({ email, password, fullName, username, year }) {
  if (!isFirebaseConfigured()) throw notConfiguredError();
  const { auth, db } = getFirebaseServices();

  const normalizedEmail = String(email || '').trim();
  const normalizedEmailLower = normalizedEmail.toLowerCase();
  const normalizedUsername = String(username || '').trim();

  if (!normalizedEmailLower) {
    throw new Error('Email is required');
  }

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
    if (err?.message === 'This email is not authorized to sign up') {
      throw err;
    }
    throw new Error('Unable to verify email authorization. Please try again');
  }

  const cred = await createUserWithEmailAndPassword(auth, normalizedEmailLower, password);

  const displayName = fullName || normalizedUsername || '';
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  await setDoc(
    doc(db, 'users', cred.user.uid),
    {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName,
      username: normalizedUsername || null,
      year: year || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return cred.user;
}

export async function signOutUser() {
  if (!isFirebaseConfigured()) return;
  const { auth } = getFirebaseServices();
  await firebaseSignOut(auth);
}

export async function resetPasswordForEmail(email) {
  if (!isFirebaseConfigured()) throw notConfiguredError();
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const envRedirectUrl = String(import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL || '').trim();
  const resetRedirectUrl = envRedirectUrl || `${window.location.origin}/#/reset-password`;

  const { auth } = getFirebaseServices();
  await sendPasswordResetEmail(auth, normalizedEmail, {
    url: resetRedirectUrl,
    handleCodeInApp: false,
  });
}

export async function logActivity({ uid, type, meta = {} }) {
  if (!isFirebaseConfigured()) return;
  try {
    const { db } = getFirebaseServices();
    if (!uid) return;
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
      console.error('Failed To Increment Daily Visit Counter', err);
    }
  } catch (err) {
    console.error('Failed To Log Activity', err);
  }
}