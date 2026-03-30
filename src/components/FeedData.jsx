import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  doc,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { createGroup, deleteGroupByPostId } from './groupMessageApi';

const FeedData = () => {
  const [tutorPosts, setTutorPosts] = useState([]);
  const [qaPosts, setQaPosts] = useState([]);
  const [allSubjects, setAllSubjects] = useState([
    'Mathematics I',
    'Discrete Math. For Computer Science',
    'Computer Programming I',
    'Fundamental Of CS AND Prof. Issues',
    'Economics For Everyday Life',
    'Physics In Daily Life',
    'Mathematics For Computing',
    'Database Systems',
    'Structure Programming',
    'Computer Organization And Operating System',
    'Human Computer Interaction',
    'Stat. For Engineerings And Scientists',
    'Numerical Methods',
    'Data Structure',
    'Object-Oriented Programming',
    'System Analysis And Design',
    'Digital Circuit',
    'English I',
    'Computer Networks',
    'Design And Analysis Of Algorithm',
    'Intelligent Systems',
    'Software Engineering',
    'Computer System Security',
    'English II',
    'Design Thinking',
    'Special Project I',
    'Special Project II'
  ]);

  // Update subjects whenever posts change
  useEffect(() => {
    const subjectsSet = new Set(allSubjects);

    tutorPosts.forEach(post => {
      if (post.subject) subjectsSet.add(post.subject);
    });

    qaPosts.forEach(post => {
      if (post.subject) subjectsSet.add(post.subject);
    });

    const sortedSubjects = Array.from(subjectsSet).sort();
    setAllSubjects(sortedSubjects);
  }, [allSubjects, tutorPosts, qaPosts]);

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
              user: { 
                name: data.authorName || 'Unknown', 
                displayName: data.authorName || 'Unknown',
                avatar: data.authorAvatar || '',
                uid: data.authorId || null,
              },
              subject: data.subject || '',
              location: data.location || '',
              title: data.title || '',
              description: data.description || '',
              experience: data.experience || '',
              date: data.date || '',
              time: data.time || '',
              minutesAgo,
              capacity: data.capacity ?? 0,
              joiners: Array.isArray(data.joiners) ? data.joiners : [],
              current: Array.isArray(data.joiners) ? data.joiners.length : 0,
              joinedCount: Array.isArray(data.joiners) ? data.joiners.length : 0,
              hours: data.hours ?? 0,
              images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
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
              images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
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
        images: Array.isArray(post.images) ? post.images : (post.imageUrl ? [post.imageUrl] : []),
      };
      setTutorPosts((prev) => [newPost, ...prev]);
      return;
    }

    const { auth, db } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Log In Before Creating A Post.');

    // Get author info from auth and users collection
    const authorName = currentUser.displayName || currentUser.email || 'You';
    let authorAvatar = currentUser.photoURL || '';
    
    // If photoURL not set in auth, try to get avatar from users collection
    if (!authorAvatar) {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        authorAvatar = userSnap.data()?.avatarUrl || userSnap.data()?.photoURL || '';
      } catch (err) {
        console.warn('Failed to read user avatar', err);
      }
    }

    const baseDoc = {
      type: 'tutor',
      authorId: currentUser.uid,
      authorName,
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
    
    // Automatically create a group for this tutor post
    try {
      await createGroup(
        docRef.id,
        baseDoc.title,
        baseDoc.subject,
        currentUser.uid,
        authorName
      );
    } catch (err) {
      console.warn('Failed to create group for post:', err);
      // Don't throw - the post was created successfully
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
        images: Array.isArray(post.images) ? post.images : (post.imageUrl ? [post.imageUrl] : []),
      };
      setQaPosts((prev) => [newPost, ...prev]);
      return;
    }

    const { auth, db } = getFirebaseServices();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Please Log In Before Creating A Post.');

    // Get author info from auth and users collection
    const authorName = currentUser.displayName || currentUser.email || 'You';
    let authorAvatar = currentUser.photoURL || '';
    
    // If photoURL not set in auth, try to get avatar from users collection
    if (!authorAvatar) {
      try {
        const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
        authorAvatar = userSnap.data()?.avatarUrl || userSnap.data()?.photoURL || '';
      } catch (err) {
        console.warn('Failed to read user avatar', err);
      }
    }

    const baseDoc = {
      type: 'qa',
      authorId: currentUser.uid,
      authorName,
      authorAvatar,
      subject: post.subject || '',
      question: post.question || post.title || 'Untitled question',
      description: post.description || '',
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      images: Array.isArray(post.images) ? post.images : (post.imageUrl ? [post.imageUrl] : []),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'qaPosts'), baseDoc);
  };

  const updateTutorPost = async (postId, updates) => {
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
  };

  const updateQaPost = async (postId, updates) => {
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
  };

  const deleteTutorPost = async (postId) => {
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

    // Delete associated group after post is deleted
    try {
      await deleteGroupByPostId(postId);
    } catch (err) {
      console.warn('Failed to delete group for post:', err);
      // Don't throw - the post was deleted successfully
    }
  };

  const deleteQaPost = async (postId) => {
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
  };

  return {
    tutorPosts,
    qaPosts,
    allSubjects,
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