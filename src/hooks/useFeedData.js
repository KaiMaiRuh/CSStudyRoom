import { useEffect, useRef, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../api/firebaseConfig.js';
import {
  createQaPost as createQaPostService,
  createTutorPost as createTutorPostService,
  deleteQaPost as deleteQaPostService,
  deleteTutorPost as deleteTutorPostService,
  updateQaPost as updateQaPostService,
  updateTutorPost as updateTutorPostService,
} from '../api/postService.js';

const PAGE_SIZE = 20;

const BASE_SUBJECTS = [
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
  'Special Project II',
];

function mapTutorPostDoc(d) {
  const data = d.data() || {};
  const createdAtDate = data.createdAt?.toDate?.() ?? null;
  const minutesAgo = createdAtDate
    ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
    : 0;

  return {
    id: d.id,
    user: {
      name: data.authorUsername || data.authorName || 'Unknown',
      displayName: data.authorName || 'Unknown',
      username: data.authorUsername || null,
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
}

function mapQaPostDoc(d) {
  const data = d.data() || {};
  const createdAtDate = data.createdAt?.toDate?.() ?? null;
  const minutesAgo = createdAtDate
    ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
    : 0;

  return {
    id: d.id,
    user: {
      name: data.authorUsername || data.authorName || 'Unknown',
      username: data.authorUsername || null,
      avatar: data.authorAvatar || '',
      uid: data.authorId || null,
    },
    subject: data.subject || '',
    question: data.question || '',
    description: data.description || '',
    date: data.date || '',
    createdAt: createdAtDate,
    time: data.time || '',
    minutesAgo,
    likes: data.likes ?? data.likeCount ?? 0,
    comments: data.comments ?? data.commentCount ?? 0,
    shares: data.shares ?? data.shareCount ?? 0,
    images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
    authorId: data.authorId || null,
    commentList: data.commentList || null,
  };
}

function mergeUniquePosts(prev, next) {
  const seen = new Set(prev.map((item) => item.id));
  const merged = [...prev];
  next.forEach((item) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    merged.push(item);
  });
  return merged;
}

export default function useFeedData() {
  const [tutorPosts, setTutorPosts] = useState([]);
  const [qaPosts, setQaPosts] = useState([]);
  const [allSubjects, setAllSubjects] = useState(BASE_SUBJECTS);
  const [tutorCursor, setTutorCursor] = useState(null);
  const [qaCursor, setQaCursor] = useState(null);
  const [hasMoreTutorPosts, setHasMoreTutorPosts] = useState(true);
  const [hasMoreQaPosts, setHasMoreQaPosts] = useState(true);
  const [isLoadingMoreTutorPosts, setIsLoadingMoreTutorPosts] = useState(false);
  const [isLoadingMoreQaPosts, setIsLoadingMoreQaPosts] = useState(false);
  const tutorLoadLockRef = useRef(false);
  const qaLoadLockRef = useRef(false);
  const [activeFeed, setActiveFeed] = useState('tutor');

  useEffect(() => {
    const subjectsSet = new Set(BASE_SUBJECTS);

    tutorPosts.forEach((post) => {
      if (post.subject) subjectsSet.add(post.subject);
    });

    qaPosts.forEach((post) => {
      if (post.subject) subjectsSet.add(post.subject);
    });

    const sortedSubjects = Array.from(subjectsSet).sort();
    setAllSubjects(sortedSubjects);
  }, [tutorPosts, qaPosts]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let disposed = false;

    try {
      const { db } = getFirebaseServices();

      const loadInitialFeed = async () => {
        const tutorQuery = query(
          collection(db, 'tutorPosts'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
        const qaQuery = query(
          collection(db, 'qaPosts'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        const [tutorSnap, qaSnap] = await Promise.all([
          getDocs(tutorQuery),
          getDocs(qaQuery),
        ]);

        if (disposed) return;

        const nextTutorPosts = tutorSnap.docs.map(mapTutorPostDoc);
        const nextQaPosts = qaSnap.docs.map(mapQaPostDoc);

        setTutorPosts(nextTutorPosts);
        setQaPosts(nextQaPosts);

        setTutorCursor(tutorSnap.docs[tutorSnap.docs.length - 1] || null);
        setQaCursor(qaSnap.docs[qaSnap.docs.length - 1] || null);

        setHasMoreTutorPosts(tutorSnap.docs.length === PAGE_SIZE);
        setHasMoreQaPosts(qaSnap.docs.length === PAGE_SIZE);
      };

      void loadInitialFeed().catch((err) => {
        if (disposed) return;
        console.error('FeedData Error', err);
      });
    } catch (err) {
      console.error('FeedData Error', err);
    }

    return () => {
      disposed = true;
    };
  }, []);

  const loadMoreTutorPosts = async () => {
    if (!isFirebaseConfigured()) return;
    if (!hasMoreTutorPosts || isLoadingMoreTutorPosts || tutorLoadLockRef.current) return;

    const { db } = getFirebaseServices();
    tutorLoadLockRef.current = true;
    setIsLoadingMoreTutorPosts(true);

    try {
      const constraints = [orderBy('createdAt', 'desc')];

      if (tutorCursor) {
        constraints.push(startAfter(tutorCursor));
      }

      constraints.push(limit(PAGE_SIZE));

      const nextQuery = query(collection(db, 'tutorPosts'), ...constraints);
      const snap = await getDocs(nextQuery);
      const nextPosts = snap.docs.map(mapTutorPostDoc);

      setTutorPosts((prev) => mergeUniquePosts(prev, nextPosts));
      setTutorCursor(snap.docs[snap.docs.length - 1] || tutorCursor);
      setHasMoreTutorPosts(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed To Load More Tutor Posts:', err);
    } finally {
      setIsLoadingMoreTutorPosts(false);
      tutorLoadLockRef.current = false;
    }
  };

  const loadMoreQaPosts = async () => {
    if (!isFirebaseConfigured()) return;
    if (!hasMoreQaPosts || isLoadingMoreQaPosts || qaLoadLockRef.current) return;

    const { db } = getFirebaseServices();
    qaLoadLockRef.current = true;
    setIsLoadingMoreQaPosts(true);

    try {
      const constraints = [orderBy('createdAt', 'desc')];

      if (qaCursor) {
        constraints.push(startAfter(qaCursor));
      }

      constraints.push(limit(PAGE_SIZE));

      const nextQuery = query(collection(db, 'qaPosts'), ...constraints);
      const snap = await getDocs(nextQuery);
      const nextPosts = snap.docs.map(mapQaPostDoc);

      setQaPosts((prev) => mergeUniquePosts(prev, nextPosts));
      setQaCursor(snap.docs[snap.docs.length - 1] || qaCursor);
      setHasMoreQaPosts(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed To Load More QA Posts:', err);
    } finally {
      setIsLoadingMoreQaPosts(false);
      qaLoadLockRef.current = false;
    }
  };

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

    await createTutorPostService(post);
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

    await createQaPostService(post);
  };

  const updateTutorPost = async (postId, updates) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    await updateTutorPostService(postId, updates);
  };

  const updateQaPost = async (postId, updates) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    await updateQaPostService(postId, updates);
  };

  const deleteTutorPost = async (postId) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    await deleteTutorPostService(postId);
  };

  const deleteQaPost = async (postId) => {
    if (!postId) throw new Error('postId is required');
    if (!isFirebaseConfigured()) return;

    await deleteQaPostService(postId);
  };

  return {
    tutorPosts,
    qaPosts,
    allSubjects,
    activeFeed,
    setActiveFeed,
    hasMoreTutorPosts,
    hasMoreQaPosts,
    isLoadingMoreTutorPosts,
    isLoadingMoreQaPosts,
    loadMoreTutorPosts,
    loadMoreQaPosts,
    addTutorPost,
    addQaPost,
    updateTutorPost,
    updateQaPost,
    deleteTutorPost,
    deleteQaPost,
  };
}