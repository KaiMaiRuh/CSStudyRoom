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

async function getAuthorProfile(db, userId) {
  if (!db || !userId) return null;

  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    return userSnap.exists() ? userSnap.data() : null;
  } catch (error) {
    console.warn('Failed to read user profile for author fields', error);
    return null;
  }
}

function resolveAuthorFields(currentUser, authorProfile) {
  return {
    authorName: authorProfile?.displayName || currentUser.displayName || currentUser.email || 'You',
    authorUsername: authorProfile?.username || null,
    authorAvatar:
      authorProfile?.avatarUrl || authorProfile?.photoURL || currentUser.photoURL || '',
  };
}

export function subscribeQaPost(db, postId, onData, onError) {
  if (!db || !postId) return () => {};
  const postRef = doc(db, 'qaPosts', postId);
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
  const likeRef = doc(db, 'qaPosts', postId, 'likes', uid);
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
  const likeRef = doc(db, 'qaPosts', postId, 'likes', uid);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export function subscribeQaPostComments(db, postId, onComments, onError) {
  if (!db || !postId) return () => {};
  const commentsRef = collection(db, 'qaPosts', postId, 'comments');
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

  const postRef = doc(db, 'qaPosts', postId);
  const likeRef = doc(db, 'qaPosts', postId, 'likes', uid);

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

  const postRef = doc(db, 'qaPosts', postId);
  const commentRef = doc(collection(db, 'qaPosts', postId, 'comments'));

  return runTransaction(db, async (tx) => {
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) throw new Error('Post not found');

    const data = postSnap.data() || {};
    const current = Number(data.commentCount ?? 0);

    tx.set(commentRef, {
      authorId: uid,
      text: cleaned,
      imageUrl: hasImage ? cleanedImageUrl : null,
      parentId: null,
      createdAt: serverTimestamp(),
    });

    tx.update(postRef, {
      commentCount: current + 1,
      updatedAt: serverTimestamp(),
      lastCommentAt: serverTimestamp(),
      lastCommentById: uid,
      lastCommentByName: null,
      lastCommentId: commentRef.id,
    });

    return { commentId: commentRef.id, commentCount: current + 1 };
  });
}

export async function deleteQaPostComment({ db, postId, commentId }) {
  if (!db) throw new Error('Firestore is not available');
  if (!postId) throw new Error('postId is required');
  if (!commentId) throw new Error('commentId is required');

  const postRef = doc(db, 'qaPosts', postId);
  const commentRef = doc(db, 'qaPosts', postId, 'comments', commentId);

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
  const { authorName, authorUsername, authorAvatar } = resolveAuthorFields(currentUser, authorProfile);

  const baseDoc = {
    type: 'tutor',
    authorId: currentUser.uid,
    authorName,
    authorUsername,
    authorAvatar,
    subject: post.subject || post.title || 'Untitled',
    location: post.location || '',
    title: post.title || post.subject || 'Untitled',
    description: post.description || '',
    experience: post.experience || '',
    date: post.date || new Date().toISOString().slice(0, 10),
    time: post.time || '',
    capacity: post.capacity ? Number(post.capacity) : 1,
    joinedCount: post.current ? Number(post.current) : 1,
    hours: post.hours ? Number(post.hours) : 1,
    images: Array.isArray(post.images) ? post.images : (post.imageUrl ? [post.imageUrl] : []),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'tutorPosts'), baseDoc);

  try {
    await createGroup(
      docRef.id,
      baseDoc.title,
      baseDoc.subject,
      currentUser.uid,
      authorName
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
  const { authorName, authorUsername, authorAvatar } = resolveAuthorFields(currentUser, authorProfile);

  const baseDoc = {
    type: 'qa',
    authorId: currentUser.uid,
    authorName,
    authorUsername,
    authorAvatar,
    subject: post.subject || '',
    question: post.question || post.title || 'Untitled question',
    description: post.description || '',
    date: post.date || new Date().toISOString().slice(0, 10),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    images: Array.isArray(post.images) ? post.images : (post.imageUrl ? [post.imageUrl] : []),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'qaPosts'), baseDoc);
  return docRef.id;
}

export async function updateTutorPost(postId, updates) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Editing A Post.');

  const postRef = doc(db, 'tutorPosts', postId);
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
    const revisionRef = doc(collection(db, 'tutorPosts', postId, 'revisions'));

    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'edit',
      before,
      createdAt: serverTimestamp(),
    });

    tx.update(postRef, { ...payload, updatedAt: serverTimestamp() });
  });
}

export async function updateQaPost(postId, updates) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Editing A Post.');

  const postRef = doc(db, 'qaPosts', postId);
  const payload = {
    subject: updates.subject || '',
    question: updates.question || updates.title || '',
    description: updates.description || '',
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
    const revisionRef = doc(collection(db, 'qaPosts', postId, 'revisions'));

    tx.set(revisionRef, {
      postId,
      editorId: currentUser.uid,
      editorName: currentUser.displayName || currentUser.email || null,
      type: 'edit',
      before,
      createdAt: serverTimestamp(),
    });

    tx.update(postRef, { ...payload, updatedAt: serverTimestamp() });
  });
}

export async function deleteTutorPost(postId) {
  if (!postId) throw new Error('postId is required');
  if (!isFirebaseConfigured()) return;

  const { auth, db } = getFirebaseServices();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please Log In Before Deleting A Post.');

  const postRef = doc(db, 'tutorPosts', postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');
    const before = snap.data() || {};

    const revisionRef = doc(collection(db, 'tutorPosts', postId, 'revisions'));

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

  const postRef = doc(db, 'qaPosts', postId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists()) throw new Error('Post not found');
    const before = snap.data() || {};

    const revisionRef = doc(collection(db, 'qaPosts', postId, 'revisions'));
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