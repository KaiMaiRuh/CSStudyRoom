import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from '../api/firebaseConfig.js';
import { COLLECTIONS } from '../api/dbSchema.js';
import {
  readActorFromDoc,
  readQaStats,
  readTutorSchedule,
  readTutorStats,
} from '../api/dbModels.js';
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
  const author = readActorFromDoc(data);
  const schedule = readTutorSchedule(data);
  const stats = readTutorStats(data);
  const joiners = Array.isArray(data.joiners) ? data.joiners : [];
  const authorName = author.displayName || author.username || 'Unknown';

  const createdAtDate = data.createdAt?.toDate?.() ?? null;
  const minutesAgo = createdAtDate
    ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
    : 0;

  return {
    id: d.id,
    user: {
      name: authorName,
      displayName: author.displayName || authorName,
      username: author.username || null,
      avatar: author.avatarUrl || '',
      uid: author.uid || null,
    },
    subject: data.subject || '',
    location: data.location || '',
    title: data.title || '',
    description: data.description || '',
    experience: data.experience || '',
    date: schedule.date,
    time: schedule.time,
    minutesAgo,
    capacity: data.capacity ?? 0,
    joiners,
    current: joiners.length,
    joinedCount: Math.max(joiners.length, stats.joinedCount),
    hours: schedule.hours,
    images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
    authorId: author.uid || null,
  };
}

function mapQaPostDoc(d) {
  const data = d.data() || {};
  const author = readActorFromDoc(data);
  const stats = readQaStats(data);

  const createdAtDate = data.createdAt?.toDate?.() ?? null;
  const minutesAgo = createdAtDate
    ? Math.max(0, Math.round((Date.now() - createdAtDate.getTime()) / 60000))
    : 0;

  return {
    id: d.id,
    user: {
      name: author.username || author.displayName || 'Unknown',
      username: author.username || null,
      avatar: author.avatarUrl || '',
      uid: author.uid || null,
    },
    subject: data.subject || data.content?.subject || '',
    question: data.question || data.content?.question || '',
    description: data.description || data.content?.description || '',
    date: data.date || '',
    createdAt: createdAtDate,
    time: data.time || '',
    minutesAgo,
    likes: stats.likes,
    comments: stats.comments,
    shares: stats.shares,
    images: Array.isArray(data.images) ? data.images : (data.imageUrl ? [data.imageUrl] : []),
    authorId: author.uid || null,
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

function clearLivePostSubscriptions(subscriptionsRef) {
  subscriptionsRef.current.forEach((unsubscribe) => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  subscriptionsRef.current.clear();
}

function syncLivePostSubscriptions({
  db,
  posts,
  collectionName,
  subscriptionsRef,
  mapDoc,
  setPosts,
  errorLabel,
}) {
  const nextIds = new Set(
    (Array.isArray(posts) ? posts : [])
      .map((post) => post?.id)
      .filter(Boolean)
  );

  subscriptionsRef.current.forEach((unsubscribe, postId) => {
    if (nextIds.has(postId)) return;
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
    subscriptionsRef.current.delete(postId);
  });

  nextIds.forEach((postId) => {
    if (subscriptionsRef.current.has(postId)) return;

    const unsubscribe = onSnapshot(
      doc(db, collectionName, postId),
      (snap) => {
        if (!snap.exists()) {
          setPosts((prev) => prev.filter((item) => item.id !== postId));
          return;
        }

        const nextPost = mapDoc(snap);
        setPosts((prev) => {
          let hasMatch = false;
          const next = prev.map((item) => {
            if (item.id !== postId) return item;
            hasMatch = true;
            return nextPost;
          });
          return hasMatch ? next : prev;
        });
      },
      (err) => {
        console.error(`Failed to subscribe ${errorLabel}`, postId, err);
      }
    );

    subscriptionsRef.current.set(postId, unsubscribe);
  });
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
  const tutorSubscriptionsRef = useRef(new Map());
  const qaSubscriptionsRef = useRef(new Map());
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
          collection(db, COLLECTIONS.TUTOR_POSTS),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );
        const qaQuery = query(
          collection(db, COLLECTIONS.QA_POSTS),
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

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    try {
      const { db } = getFirebaseServices();
      syncLivePostSubscriptions({
        db,
        posts: tutorPosts,
        collectionName: COLLECTIONS.TUTOR_POSTS,
        subscriptionsRef: tutorSubscriptionsRef,
        mapDoc: mapTutorPostDoc,
        setPosts: setTutorPosts,
        errorLabel: 'tutor post',
      });
    } catch (err) {
      console.error('Failed to sync live tutor post subscriptions', err);
    }
  }, [tutorPosts]);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    try {
      const { db } = getFirebaseServices();
      syncLivePostSubscriptions({
        db,
        posts: qaPosts,
        collectionName: COLLECTIONS.QA_POSTS,
        subscriptionsRef: qaSubscriptionsRef,
        mapDoc: mapQaPostDoc,
        setPosts: setQaPosts,
        errorLabel: 'qa post',
      });
    } catch (err) {
      console.error('Failed to sync live qa post subscriptions', err);
    }
  }, [qaPosts]);

  useEffect(() => {
    return () => {
      clearLivePostSubscriptions(tutorSubscriptionsRef);
      clearLivePostSubscriptions(qaSubscriptionsRef);
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

      const nextQuery = query(collection(db, COLLECTIONS.TUTOR_POSTS), ...constraints);
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

      const nextQuery = query(collection(db, COLLECTIONS.QA_POSTS), ...constraints);
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