import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { isDataUrlImage } from './imageBase64';

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

export async function addQaPostComment({ db, postId, uid, authorName, authorAvatar, text, imageUrl = null }) {
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
      authorName: authorName || null,
      authorAvatar: authorAvatar || null,
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
      lastCommentByName: authorName || null,
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
