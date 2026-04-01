import {
  collection,
  doc,
  getDoc,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from './firebaseConfig.js';
import { createGroup, deleteGroupByPostId } from './chatService.js';
import { isDataUrlImage } from '../utils/imageHelpers.js';
import {
  COLLECTIONS,
  qaPostCommentsPath,
  qaPostCommentDocPath,
  qaPostDocPath,
  qaPostLikeDocPath,
  qaPostRevisionsPath,
  tutorPostDocPath,
  tutorPostRevisionsPath,
  userDocPath,
} from './dbSchema.js';
import {
  buildActorFromCurrentUser,
  buildActorSnapshot,
  buildQaCommentDocument,
  buildQaPostDocument,
  buildTutorPostDocument,
} from './dbModels.js';

async function getAuthorProfile(db, userId) {
  if (!db || !userId) return null;

  try {
    const userSnap = await getDoc(doc(db, ...userDocPath(userId)));
    return userSnap.exists() ? userSnap.data() : null;
  } catch (error) {
    console.warn('Failed to read user profile for author fields', error);
    return null;
  }
}

export function subscribeQaPost(db, postId, onData, onError) {
  if (!db || !postId) return () => {};
  const postRef = doc(db, ...qaPostDocPath(postId));
  return onSnapshot(
    postRef,
    (snap) => {
      if (!snap.exists()) {
        onData?.(null);
        return;
      }
      onData?.({ id: snap.id, ...snap.data() });
    },
    onError
  );
}

export function subscribeQaPostLikeStatus(db, postId, uid, onLiked, onError) {
  if (!db || !postId || !uid) return () => {};
  const likeRef = doc(db, ...qaPostLikeDocPath(postId, uid));
  return onSnapshot(
    likeRef,
    (snap) => {
      onLiked?.(snap.exists());
    },
    onError
  );
}

export async function getQaPostLikeStatus(db, postId, uid) {
  if (!db || !postId || !uid) return false;
  const likeRef = doc(db, ...qaPostLikeDocPath(postId, uid));
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export function subscribeQaPostComments(db, postId, onComments, onError) {
  if (!db || !postId) return () => {};
  const commentsRef = collection(db, ...qaPostCommentsPath(postId));
  const q = query(commentsRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snap) => {
      const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onComments?.(next);
    },
    onError
  );
}

export async function toggleQaPostLike({ db, postId, uid, authorName }) {
  if (!db) throw new Error('Firestore is not available');
  if (!postId) throw new Error('postId is required');
  if (!uid) throw new Error('Please log in to like posts');

  const postRef = doc(db, ...qaPostDocPath(postId));
  const likeRef = doc(db, ...qaPostLikeDocPath(postId, uid));

  return runTransaction(db, async (tx) => {
    const [postSnap, likeSnap] = await Promise.all([tx.get(postRef), tx.get(likeRef)]);
    if (!postSnap.exists()) throw new Error('Post not found');

    const data = postSnap.data() || {};
    const current = Number(data.likeCount ?? 0);

    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, {
        likeCount: Math.max(0, current - 1),
        updatedAt: serverTimestamp(),
      });
      return { liked: false, likeCount: Math.max(0, current - 1) };
    }

    tx.set(likeRef, {
      userId: uid,
      userName: authorName || null,
      actor: {
        uid,
        displayName: authorName || null,
      },
      createdAt: serverTimestamp(),
    });
    tx.update(postRef, {
      likeCount: current + 1,
      updatedAt: serverTimestamp(),
      lastLikeAt: serverTimestamp(),
      lastLikeById: uid,
      lastLikeByName: authorName || null,
    });
    return { liked: true, likeCount: current + 1 };
  });
}

export async function addQaPostComment({ db, postId, uid, text, imageUrl = null }) {
  if (!db) throw new Error('Firestore is not available');
  if (!postId) throw new Error('postId is required');
  if (!uid) throw new Error('Please log in to comment');

  const cleaned = String(text || '').trim();
  const cleanedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  const hasText = Boolean(cleaned);
  const hasImage = Boolean(cleanedImageUrl);

  if (!hasText && !hasImage) throw new Error('Comment cannot be empty');
  if (hasImage && !isDataUrlImage(cleanedImageUrl)) throw new Error('Invalid comment image');

  const postRef = doc(db, ...qaPostDocPath(postId));
  const commentRef = doc(collection(db, ...qaPostCommentsPath(postId)));

  const authorProfile = await getAuthorProfile(db, uid);
  const commentActor = buildActorSnapshot({
    uid,
    displayName: authorProfile?.displayName,
    username: authorProfile?.username,
    avatarUrl: authorProfile?.avatarUrl || authorProfile?.photoURL,
    email: authorProfile?.email,
  });
  const commentAuthorLabel = commentActor.username
    ? `@${commentActor.username}`
    : (commentActor.displayName || null);

  return runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw new Error('Post not found');

    const data = postSnap.data() || {};
    const current = Number(data.commentCount ?? 0);

    tx.set(
      commentRef,
      buildQaCommentDocument({
        uid,
        text: cleaned,
        imageUrl: hasImage ? cleanedImageUrl : null,
        actor: commentActor,
      })
    );

    tx.update(postRef, {
      commentCount: current + 1,
      updatedAt: serverTimestamp(),
      lastCommentAt: serverTimestamp(),
      lastCommentById: uid,
      lastCommentByName: commentAuthorLabel,
      lastCommentId: commentRef.id,
    });

    return { commentId: commentRef.id, commentCount: current + 1 };
  });
}

export async function deleteQaPostComment({ db, postId, commentId }) {
  if (!db) throw new Error('Firestore is not available');
  if (!postId) throw new Error('postId is required');
  if (!commentId) throw new Error('commentId is required');

  const postRef = doc(db, ...qaPostDocPath(postId));
  const commentRef = doc(db, ...qaPostCommentDocPath(postId, commentId));

  return runTransaction(db, async (tx) => {
    const [postSnap, commentSnap] = await Promise.all([tx.get(postRef), tx.get(commentRef)]);
    if (!postSnap.exists()) throw new Error('Post not found');
    if (!commentSnap.exists()) throw new Error('Comment not found');

    const data = postSnap.data() || {};
    const current = Number(data.commentCount ?? 0);

    tx.delete(commentRef);
    tx.update(postRef, {
      commentCount: Math.max(0, current - 1),
      updatedAt: serverTimestamp(),
    });

    return { deleted: true, commentCount: Math.max(0, current - 1) };
  });
}

export async function createTutorPost(post) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Creating A Post.');

  const authorProfile = await getAuthorProfile(db, currentUser.uid);
  const authorActor = buildActorFromCurrentUser(currentUser, authorProfile);
  const baseDoc = buildTutorPostDocument(post, authorActor);

  const docRef = await addDoc(collection(db, COLLECTIONS.TUTOR_POSTS), baseDoc);

  try {
    await createGroup(
      docRef.id,
      baseDoc.title,
      baseDoc.subject,
      authorActor.uid,
      authorActor.displayName,
      authorActor.avatarUrl,
      authorActor.username
    );
  } catch (error) {
    console.warn('Failed to create group for post:', error);
  }

  return docRef.id;
}

export async function createQaPost(post) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Creating A Post.');

  const authorProfile = await getAuthorProfile(db, currentUser.uid);
  const authorActor = buildActorFromCurrentUser(currentUser, authorProfile);
  const baseDoc = buildQaPostDocument(post, authorActor);

  const docRef = await addDoc(collection(db, COLLECTIONS.QA_POSTS), baseDoc);
  return docRef.id;
}

export async function updateTutorPost(postId, updates) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Editing A Post.');

  const postRef = doc(db, ...tutorPostDocPath(postId));
  const payload = {
    subject: updates.subject || updates.title || '',
    location: updates.location || '',
    title: updates.title || '',
    description: updates.description || '',
    experience: updates.experience || '',
    date: updates.date || '',
    time: updates.time || '',
    hours: updates.hours ? Number(updates.hours) : 0,
    capacity: updates.capacity ? Number(updates.capacity) : 1,
  };

  payload.schedule = {
    date: payload.date,
    time: payload.time,
    hours: payload.hours,
  };

  if (Array.isArray(updates.images)) {
    payload.images = updates.images;
  } else if (typeof updates.imageUrl === 'string') {
    payload.images = [updates.imageUrl];
  } else if (updates.imageUrl === null) {
    payload.images = [];
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');

    const before = snap.data() || {};
    const revisionRef = doc(collection(db, ...tutorPostRevisionsPath(postId)));
    const joinedCount = Number(
      before.joinedCount
      ?? before.joinCount
      ?? (Array.isArray(before.joiners) ? before.joiners.length : 0)
    );

    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'edit',
      before,
      createdAt: serverTimestamp(),
    });

    tx.update(postRef, {
      ...payload,
      stats: {
        ...(before.stats || {}),
        joinedCount: Number.isFinite(joinedCount) ? Math.max(0, joinedCount) : 0,
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateQaPost(postId, updates) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Editing A Post.');

  const postRef = doc(db, ...qaPostDocPath(postId));
  const payload = {
    subject: updates.subject || '',
    question: updates.question || updates.title || '',
    description: updates.description || '',
  };

  payload.content = {
    subject: payload.subject,
    question: payload.question,
    description: payload.description,
  };

  if (Array.isArray(updates.images)) {
    payload.images = updates.images;
  } else if (typeof updates.imageUrl === 'string') {
    payload.images = [updates.imageUrl];
  } else if (updates.imageUrl === null) {
    payload.images = [];
  }

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');

    const before = snap.data() || {};
    const revisionRef = doc(collection(db, ...qaPostRevisionsPath(postId)));

    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'edit',
      before,
      createdAt: serverTimestamp(),
    });

    tx.update(postRef, {
      ...payload,
      stats: {
        ...(before.stats || {}),
        likeCount: Number(before.likeCount ?? before.stats?.likeCount ?? 0),
        commentCount: Number(before.commentCount ?? before.stats?.commentCount ?? 0),
        shareCount: Number(before.shareCount ?? before.stats?.shareCount ?? 0),
      },
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteTutorPost(postId) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Deleting A Post.');

  const postRef = doc(db, ...tutorPostDocPath(postId));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');
    const before = snap.data() || {};

    const revisionRef = doc(collection(db, ...tutorPostRevisionsPath(postId)));

    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'delete',
      before,
      createdAt: serverTimestamp(),
    });

    tx.delete(postRef);
  });

  try {
    await deleteGroupByPostId(postId);
  } catch (error) {
    console.warn('Failed to delete group for post:', error);
  }
}

export async function deleteQaPost(postId) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Deleting A Post.');

  const postRef = doc(db, ...qaPostDocPath(postId));
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');
    const before = snap.data() || {};

    const revisionRef = doc(collection(db, ...qaPostRevisionsPath(postId)));
    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'delete',
      before,
      createdAt: serverTimestamp(),
    });

    tx.delete(postRef);
  });
}