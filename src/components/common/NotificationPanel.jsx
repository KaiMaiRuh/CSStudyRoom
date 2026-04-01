// NotificationPanel.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import { subscribeToLatestGroupMessage, subscribeToUserGroups } from '../../api/chatService.js';

const toMillis = (ts) => (ts?.toMillis?.() ? ts.toMillis() : 0);
const toTimestamp = (millis) => {
  if (!Number.isFinite(millis) || millis <= 0) return null;
  try {
    return Timestamp.fromMillis(millis);
  } catch {
    return null;
  }
};

const NOTIFICATION_EXIT_MS = 300;

const NotificationPanel = ({ onClose, isOpen = true, onCountChange }) => {
  const { user } = useAuth();
  const [isRendered, setIsRendered] = useState(Boolean(isOpen));
  const [isClosing, setIsClosing] = useState(false);
  const [groupState, setGroupState] = useState({ uid: null, groups: [] });
  const [qaState, setQaState] = useState({ uid: null, posts: [] });
  const [groupReadsState, setGroupReadsState] = useState({ uid: null, map: {} });
  const [qaReadState, setQaReadState] = useState({ uid: null, lastSeenAt: null });
  const [latestMessagesByGroupId, setLatestMessagesByGroupId] = useState({});
  const [groupError, setGroupError] = useState(null);
  const [qaError, setQaError] = useState(null);
  const markSignatureRef = useRef('');

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      return undefined;
    }
    if (!isRendered) return undefined;

    setIsClosing(true);
    const timerId = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
    }, NOTIFICATION_EXIT_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isOpen, isRendered]);

  const markGroupAsRead = useCallback(async (groupId, tsMillis) => {
    if (!groupId) return;
    if (!user?.uid) return;
    if (!isFirebaseConfigured()) return;

    const ts = toTimestamp(tsMillis);
    if (!ts) return;

    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, 'users', user.uid, 'groupReads', groupId),
      {
        lastReadAt: ts,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user?.uid]);

  const markQaNotificationsAsRead = useCallback(async (tsMillis) => {
    if (!user?.uid) return;
    if (!isFirebaseConfigured()) return;

    const ts = toTimestamp(tsMillis);
    if (!ts) return;

    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, 'users', user.uid, 'notificationReads', 'qa'),
      {
        lastSeenAt: ts,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    try {
      const unsub = subscribeToUserGroups(user.uid, (groups) => {
        setGroupState({ uid: user.uid, groups: Array.isArray(groups) ? groups : [] });
        setGroupError(null);
      });
      return () => {
        setGroupState({ uid: null, groups: [] });
        setGroupError(null);
        if (typeof unsub === 'function') unsub();
      };
    } catch (err) {
      console.error('Failed to subscribe groups for notifications', err);
      Promise.resolve().then(() => {
        setGroupState({ uid: user.uid, groups: [] });
        setGroupError(err?.message || 'Failed to load group notifications');
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    if (!isFirebaseConfigured()) {
      return;
    }

    const { db } = getFirebaseServices();
    const readsRef = collection(db, 'users', user.uid, 'groupReads');

    return onSnapshot(
      readsRef,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setGroupReadsState({ uid: user.uid, map });
      },
      (err) => {
        console.error('Failed to subscribe group read state for notifications', err);
        setGroupReadsState({ uid: user.uid, map: {} });
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    if (!isFirebaseConfigured()) {
      return;
    }

    const { db } = getFirebaseServices();
    const qaReadRef = doc(db, 'users', user.uid, 'notificationReads', 'qa');

    return onSnapshot(
      qaReadRef,
      (snap) => {
        setQaReadState({
          uid: user.uid,
          lastSeenAt: snap.exists() ? snap.data()?.lastSeenAt || null : null,
        });
      },
      (err) => {
        console.error('Failed to subscribe QA notification read state', err);
        setQaReadState({ uid: user.uid, lastSeenAt: null });
      }
    );
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }
    if (!isFirebaseConfigured()) {
      return;
    }

    const { db } = getFirebaseServices();
    let unsub = null;

    const subscribePrimary = () =>
      onSnapshot(
        query(
          collection(db, 'qaPosts'),
          where('authorId', '==', user.uid),
          orderBy('updatedAt', 'desc'),
          limit(40)
        ),
        (snap) => {
          const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setQaState({ uid: user.uid, posts: next });
          setQaError(null);
        },
        (err) => {
          console.error('Failed to subscribe QA posts for notifications', err);
          if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
            if (typeof unsub === 'function') unsub();
            unsub = subscribeFallback();
            return;
          }
          setQaState({ uid: user.uid, posts: [] });
          setQaError(err?.message || 'Failed to load QA notifications');
        }
      );

    const subscribeFallback = () =>
      onSnapshot(
        query(collection(db, 'qaPosts'), where('authorId', '==', user.uid), limit(40)),
        (snap) => {
          const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setQaState({ uid: user.uid, posts: next });
          setQaError(null);
        },
        (err) => {
          console.error('Failed to subscribe QA posts fallback for notifications', err);
          setQaState({ uid: user.uid, posts: [] });
          setQaError(err?.message || 'Failed to load QA notifications');
        }
      );

    unsub = subscribePrimary();
    return () => {
      setQaState({ uid: null, posts: [] });
      if (typeof unsub === 'function') unsub();
    };
  }, [user?.uid]);

  const groups = useMemo(() => {
    return user?.uid && groupState.uid === user.uid ? (Array.isArray(groupState.groups) ? groupState.groups : []) : [];
  }, [groupState, user]);

  const groupReadsMap = useMemo(() => {
    if (!user?.uid || groupReadsState.uid !== user.uid) return {};
    return groupReadsState.map && typeof groupReadsState.map === 'object' ? groupReadsState.map : {};
  }, [groupReadsState, user]);

  useEffect(() => {
    const groupIds = (Array.isArray(groups) ? groups : [])
      .map((g) => g?.id)
      .filter(Boolean);

    if (groupIds.length === 0) {
      setLatestMessagesByGroupId({});
      return;
    }

    setLatestMessagesByGroupId((prev) => {
      const next = {};
      groupIds.forEach((groupId) => {
        if (prev[groupId]) next[groupId] = prev[groupId];
      });
      return next;
    });

    const unsubs = groupIds.map((groupId) => subscribeToLatestGroupMessage(
      groupId,
      (latest) => {
        setLatestMessagesByGroupId((prev) => ({
          ...prev,
          [groupId]: latest,
        }));
      },
      (err) => {
        console.error('Failed to subscribe latest group message for notifications', groupId, err);
      }
    ));

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [groups]);

  const groupNotis = useMemo(() => {
    return (Array.isArray(groups) ? groups : [])
      .map((g) => {
        const latest = latestMessagesByGroupId[g.id] || null;
        if (!latest) return null;

        const ts = toMillis(latest.timestamp);
        if (!ts) return null;

        const type = latest.type || 'text';
        const senderId = latest.senderId || null;

        if (type === 'system') {
          // Do not notify the actor about their own join/leave system message.
          if (senderId && senderId === user?.uid) return null;
        }
        if (senderId && senderId === user?.uid) {
          return null;
        }

        const messageId = latest.id || null;
        const target = messageId
          ? `/groupmessage/${g.id}/m/${messageId}`
          : `/groupmessage/${g.id}`;

        const lastReadMillis = groupReadsMap?.[g.id]?.lastReadAt?.toMillis?.()
          || groupReadsMap?.[g.id]?.updatedAt?.toMillis?.()
          || 0;

        const body = type === 'share'
          ? `Shared post: ${latest.sharedPost?.title || latest.text || 'Shared a post'}`
          : (latest.text || 'New message');

        return {
          id: `group-${g.id}-${messageId || 'latest'}`,
          kind: 'group',
          groupId: g.id,
          ts,
          unread: ts > lastReadMillis,
          title: g.name || 'Group message',
          body,
          targetHash: target,
        };
      })
      .filter(Boolean);
  }, [groupReadsMap, groups, latestMessagesByGroupId, user]);

  const posts = useMemo(() => {
    return user?.uid && qaState.uid === user.uid ? (Array.isArray(qaState.posts) ? qaState.posts : []) : [];
  }, [qaState, user]);

  const qaLastSeenMillis = useMemo(() => {
    if (!user?.uid || qaReadState.uid !== user.uid) return 0;
    return toMillis(qaReadState.lastSeenAt);
  }, [qaReadState, user]);

  const qaNotis = useMemo(() => {
    const items = [];
    posts.forEach((p) => {
      const postId = p?.id;
      if (!postId) return;
      const title = p.question || p.subject || 'Q&A post';

      if (p.lastLikeAt && p.lastLikeById && p.lastLikeById !== user.uid) {
        const ts = toMillis(p.lastLikeAt);
        items.push({
          id: `qa-like-${postId}`,
          kind: 'qa_like',
          ts,
          unread: ts > qaLastSeenMillis,
          title: 'New like',
          body: `${p.lastLikeByName || 'Someone'} liked your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }

      if (p.lastCommentAt && p.lastCommentById && p.lastCommentById !== user.uid) {
        const ts = toMillis(p.lastCommentAt);
        items.push({
          id: `qa-comment-${postId}`,
          kind: 'qa_comment',
          ts,
          unread: ts > qaLastSeenMillis,
          title: 'New comment',
          body: `${p.lastCommentByName || 'Someone'} commented on your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }

      if (p.lastShareAt && p.lastShareById && p.lastShareById !== user.uid) {
        const ts = toMillis(p.lastShareAt);
        items.push({
          id: `qa-share-${postId}`,
          kind: 'qa_share',
          ts,
          unread: ts > qaLastSeenMillis,
          title: 'New share',
          body: `${p.lastShareByName || 'Someone'} shared your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }
    });
    return items;
  }, [posts, qaLastSeenMillis, user]);

  const notis = useMemo(() => {
    const next = [...groupNotis, ...qaNotis]
      .filter((n) => n.ts)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 60);
    return next;
  }, [groupNotis, qaNotis]);

  const notisCount = useMemo(() => {
    return notis.filter((n) => n.unread).length;
  }, [notis]);

  useEffect(() => {
    if (!isOpen) {
      markSignatureRef.current = '';
      return;
    }
    if (!user?.uid) return;

    const unreadItems = notis.filter((n) => n.unread);
    if (unreadItems.length === 0) {
      markSignatureRef.current = '';
      return;
    }

    const signature = unreadItems.map((n) => `${n.id}:${n.ts}`).join('|');
    if (markSignatureRef.current === signature) {
      return;
    }
    markSignatureRef.current = signature;

    const latestGroupTsById = {};
    let latestQaTs = 0;

    unreadItems.forEach((n) => {
      if (n.kind === 'group' && n.groupId) {
        latestGroupTsById[n.groupId] = Math.max(latestGroupTsById[n.groupId] || 0, n.ts || 0);
        return;
      }
      latestQaTs = Math.max(latestQaTs, n.ts || 0);
    });

    const writes = [];
    Object.entries(latestGroupTsById).forEach(([groupId, ts]) => {
      writes.push(markGroupAsRead(groupId, ts));
    });
    if (latestQaTs > 0) {
      writes.push(markQaNotificationsAsRead(latestQaTs));
    }

    if (writes.length === 0) return;
    void Promise.all(writes).catch((err) => {
      console.warn('Failed to mark notifications as read', err);
      markSignatureRef.current = '';
    });
  }, [isOpen, markGroupAsRead, markQaNotificationsAsRead, notis, user?.uid]);

  useEffect(() => {
    onCountChange?.(notisCount);
  }, [notisCount, onCountChange]);

  const handleNotificationClick = async (n) => {
    try {
      if (n.kind === 'group' && n.groupId) {
        await markGroupAsRead(n.groupId, n.ts);
      } else {
        await markQaNotificationsAsRead(n.ts);
      }
    } catch (err) {
      console.warn('Failed to mark notification read on click', err);
    }

    try {
      window.location.hash = n.targetHash;
    } catch {
      // ignore
    }
    onClose?.();
  };

  if (!isRendered) return null;

  return (
    <div className={`notification-panel-overlay ${isClosing ? 'is-closing' : 'is-open'}`}>
      <div className={`notification-panel ${isClosing ? 'is-closing' : 'is-open'}`}>
        <button className="back-button" onClick={onClose}>
          <FaArrowLeft />
        </button>

        <div className="notification-content">
          <h2 className="notification-title">Notifications</h2>

          {!user?.uid ? (
            <p className="notification-hint">Please log in to see notifications.</p>
          ) : notis.length === 0 && (groupError || qaError) ? (
            <p className="notification-error">{groupError || qaError}</p>
          ) : notis.length === 0 ? (
            <>
              <p>No notifications</p>
              <p>Any new notifications will appear here</p>
            </>
          ) : (
            <div className="notification-list" role="list" aria-label="Notifications">
              {(groupError || qaError) && (
                <div className="notification-error" role="status">
                  {groupError || qaError}
                </div>
              )}
              {notis.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notification-item ${n.unread ? 'is-unread' : ''}`}
                  onClick={() => {
                    void handleNotificationClick(n);
                  }}
                >
                  {n.unread ? <span className="notification-item-dot" aria-hidden="true" /> : null}
                  <div className="notification-item-title">{n.title}</div>
                  <div className="notification-item-body">{n.body}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;