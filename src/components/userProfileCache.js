import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';

const profileCache = Object.create(null);
const inflightCache = Object.create(null);

function normalizeUserProfile(userId, raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      uid: userId,
      displayName: '',
      username: null,
      avatarUrl: '',
      email: null,
    };
  }

  return {
    uid: userId,
    displayName: typeof raw.displayName === 'string' ? raw.displayName : '',
    username: typeof raw.username === 'string' ? raw.username : null,
    avatarUrl:
      (typeof raw.avatarUrl === 'string' && raw.avatarUrl) ||
      (typeof raw.photoURL === 'string' && raw.photoURL) ||
      (typeof raw.avatar === 'string' && raw.avatar) ||
      '',
    email: typeof raw.email === 'string' ? raw.email : null,
  };
}

function resolveDb(providedDb) {
  if (providedDb) return providedDb;
  if (!isFirebaseConfigured()) return null;
  try {
    return getFirebaseServices().db;
  } catch {
    return null;
  }
}

export function getCachedUserProfile(userId) {
  if (!userId) return null;
  return profileCache[userId] || null;
}

export function clearUserProfileCache(userId) {
  if (userId) {
    delete profileCache[userId];
    delete inflightCache[userId];
    return;
  }

  Object.keys(profileCache).forEach((key) => delete profileCache[key]);
  Object.keys(inflightCache).forEach((key) => delete inflightCache[key]);
}

export async function getUserProfileById(userId, { db } = {}) {
  if (!userId) return null;

  if (profileCache[userId]) {
    return profileCache[userId];
  }

  if (inflightCache[userId]) {
    return inflightCache[userId];
  }

  const resolvedDb = resolveDb(db);
  if (!resolvedDb) {
    const fallback = normalizeUserProfile(userId, null);
    profileCache[userId] = fallback;
    return fallback;
  }

  inflightCache[userId] = getDoc(doc(resolvedDb, 'users', userId))
    .then((snap) => {
      const next = normalizeUserProfile(userId, snap.exists() ? snap.data() : null);
      profileCache[userId] = next;
      return next;
    })
    .catch((err) => {
      console.warn('Failed to fetch user profile', userId, err);
      const fallback = normalizeUserProfile(userId, null);
      profileCache[userId] = fallback;
      return fallback;
    })
    .finally(() => {
      delete inflightCache[userId];
    });

  return inflightCache[userId];
}

export function useUserProfiles(userIds, { enabled = true, db } = {}) {
  const normalizedIds = useMemo(() => {
    const rawIds = Array.isArray(userIds) ? userIds : [];
    const set = new Set();
    rawIds.forEach((id) => {
      if (!id) return;
      set.add(String(id));
    });
    return Array.from(set);
  }, [userIds]);

  const idsKey = useMemo(() => normalizedIds.join('|'), [normalizedIds]);

  const [profileMap, setProfileMap] = useState(() => {
    const next = {};
    normalizedIds.forEach((id) => {
      const cached = getCachedUserProfile(id);
      if (cached) next[id] = cached;
    });
    return next;
  });

  useEffect(() => {
    if (!enabled || normalizedIds.length === 0) {
      setProfileMap({});
      return;
    }

    let disposed = false;

    const fromCache = {};
    normalizedIds.forEach((id) => {
      const cached = getCachedUserProfile(id);
      if (cached) fromCache[id] = cached;
    });
    setProfileMap((prev) => ({ ...prev, ...fromCache }));

    const missingIds = normalizedIds.filter((id) => !getCachedUserProfile(id));
    if (missingIds.length === 0) {
      return;
    }

    Promise.all(missingIds.map((id) => getUserProfileById(id, { db })))
      .then(() => {
        if (disposed) return;
        const next = {};
        normalizedIds.forEach((id) => {
          const cached = getCachedUserProfile(id);
          if (cached) next[id] = cached;
        });
        setProfileMap(next);
      })
      .catch((err) => {
        console.warn('Failed to resolve user profiles', err);
      });

    return () => {
      disposed = true;
    };
  }, [db, enabled, idsKey, normalizedIds]);

  return profileMap;
}
