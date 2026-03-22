import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';

const FeedData = () => {
  const [tutorPosts, setTutorPosts] = useState([]);
  const [qaPosts, setQaPosts] = useState([]);

  const [activeFeed, setActiveFeed] = useState('tutor');

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let unsubTutor = null;
    let unsubQa = null;

    try {
      const { db } = getFirebaseServices();

      const tutorQuery = query(collection(db, 'tutorPosts'), orderBy('createdAt', 'desc'));
      unsubTutor = onSnapshot(
        tutorQuery,
        (snap) => {
          const next = snap.docs.map((d) => {
            const data = d.data() || {};
            const createdAtDate = data.createdAt?.toDate?.() ?? null;
            const minutesAgo = createdAtDate
              ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
              : 0;

            return {
              id: d.id,
              user: { name: data.authorName || 'Unknown', avatar: data.authorAvatar || '' },
              subject: data.subject || '',
              location: data.location || '',
              title: data.title || '',
              description: data.description || '',
              experience: data.experience || '',
              date: data.date || '',
              time: data.time || '',
              minutesAgo,
              capacity: data.capacity ?? 0,
              current: data.current ?? data.joinedCount ?? 0,
              joinedCount: data.joinedCount ?? data.current ?? 0,
              hours: data.hours ?? 0,
              imageUrl: data.imageUrl || null,
              authorId: data.authorId || null,
            };
          });
          setTutorPosts(next);
        },
        (err) => {
          console.error('Failed To Subscribe To Tutor Posts:', err);
        }
      );

      const qaQuery = query(collection(db, 'qaPosts'), orderBy('createdAt', 'desc'));
      unsubQa = onSnapshot(
        qaQuery,
        (snap) => {
          const next = snap.docs.map((d) => {
            const data = d.data() || {};
            const createdAtDate = data.createdAt?.toDate?.() ?? null;
            const minutesAgo = createdAtDate
              ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
              : 0;

            return {
              id: d.id,
              user: { name: data.authorName || 'Unknown', avatar: data.authorAvatar || '' },
              subject: data.subject || '',
              question: data.question || '',
              description: data.description || '',
              date: data.date || '',
              time: data.time || '',
              minutesAgo,
              likes: data.likes ?? data.likeCount ?? 0,
              comments: data.comments ?? data.commentCount ?? 0,
              shares: data.shares ?? data.shareCount ?? 0,
              imageUrl: data.imageUrl || null,
              authorId: data.authorId || null,
              commentList: data.commentList || null,
            };
          });
          setQaPosts(next);
        },
        (err) => {
          console.error('Failed To Subscribe To QA Posts:', err);
        }
      );
    } catch (err) {
      console.error('FeedData Error', err);
    }

    return () => {
      if (typeof unsubTutor === 'function') unsubTutor();
      if (typeof unsubQa === 'function') unsubQa();
    };
  }, []);

  const addTutorPost = async (post) => {
    if (!isFirebaseConfigured()) {
      const id = Date.now();
      const newPost = {
        id,
        user: { name: post.author || 'You', avatar: '' },
        subject: post.subject || post.title || 'Untitled',
        location: post.location || '',
        title: post.title || post.subject || 'Untitled',
        description: post.description || '',
        date: post.date || new Date().toISOString().slice(0, 10),
        time: post.time || '',
        minutesAgo: 0,
        capacity: post.capacity ? Number(post.capacity) : 1,
        current: post.current ? Number(post.current) : 1,
        hours: post.hours ? Number(post.hours) : 1,
      };
      setTutorPosts((prev) => [newPost, ...prev]);
      return;
    }

    const { auth, db, storage } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Creating A Post.');

    const baseDoc = {
      type: 'tutor',
      authorId: currentUser.uid,
      authorName: post.author || currentUser.displayName || currentUser.email || 'You',
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'tutorPosts'), baseDoc);

    const imageFile = post.image;
    if (imageFile instanceof File) {
      const imageRef = ref(storage, `posts/tutor/${currentUser.uid}/${docRef.id}/${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      await updateDoc(doc(db, 'tutorPosts', docRef.id), { imageUrl, updatedAt: serverTimestamp() });
    }
  };

  const addQaPost = async (post) => {
    if (!isFirebaseConfigured()) {
      const id = Date.now();
      const newPost = {
        id,
        user: { name: post.author || 'You', avatar: '' },
        subject: post.subject || '',
        question: post.question || post.title || 'Untitled question',
        date: post.date || new Date().toISOString().slice(0, 10),
        time: post.time || '',
        minutesAgo: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };
      setQaPosts((prev) => [newPost, ...prev]);
      return;
    }

    const { auth, db, storage } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Creating A Post.');

    const baseDoc = {
      type: 'qa',
      authorId: currentUser.uid,
      authorName: post.author || currentUser.displayName || currentUser.email || 'You',
      subject: post.subject || '',
      question: post.question || post.title || 'Untitled question',
      description: post.description || '',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'qaPosts'), baseDoc);

    const imageFile = post.image;
    if (imageFile instanceof File) {
      const imageRef = ref(storage, `posts/qa/${currentUser.uid}/${docRef.id}/${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      await updateDoc(doc(db, 'qaPosts', docRef.id), { imageUrl, updatedAt: serverTimestamp() });
    }
  };

  const updateTutorPost = async (postId, updates) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    const { auth, db, storage } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Editing A Post.');

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

    const imageFile = updates.image;
    if (imageFile instanceof File) {
      const imageRef = ref(storage, `posts/tutor/${currentUser.uid}/${postId}/${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      payload.imageUrl = imageUrl;
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
  };

  const updateQaPost = async (postId, updates) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    const { auth, db, storage } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Editing A Post.');

    const postRef = doc(db, 'qaPosts', postId);
    const payload = {
      subject: updates.subject || '',
      question: updates.question || updates.title || '',
      description: updates.description || '',
    };

    const imageFile = updates.image;
    if (imageFile instanceof File) {
      const imageRef = ref(storage, `posts/qa/${currentUser.uid}/${postId}/${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      payload.imageUrl = imageUrl;
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
  };

  const deleteTutorPost = async (postId) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;
    const { auth, db } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Deleting A Post.');

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
  };

  const deleteQaPost = async (postId) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;
    const { auth, db } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Sign In Before Deleting A Post.');

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
  };

  return {
    tutorPosts,
    qaPosts,
    activeFeed,
    setActiveFeed,
    addTutorPost,
    addQaPost,
    updateTutorPost,
    updateQaPost,
    deleteTutorPost,
    deleteQaPost,
  };
};

export default FeedData;