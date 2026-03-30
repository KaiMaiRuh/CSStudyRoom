// NotificationPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft } from 'react-icons/fa';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { subscribeToUserGroups } from './groupMessageApi';

const toMillis = (ts) => (ts?.toMillis?.() ? ts.toMillis() : 0);

const NotificationPanel = ({ onClose, isOpen = true, onCountChange }) => {
  const { user } = useAuth();
  const [groupState, setGroupState] = useState({ uid: null, groups: [] });
  const [qaState, setQaState] = useState({ uid: null, posts: [] });
  const [groupError, setGroupError] = useState(null);
  const [qaError, setQaError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setGroupState({ uid: null, groups: [] });
      return;
    }

    try {
      const unsub = subscribeToUserGroups(user.uid, (groups) => {
        setGroupState({ uid: user.uid, groups: Array.isArray(groups) ? groups : [] });
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    } catch (err) {
      console.error('Failed to subscribe groups for notifications', err);
      setGroupState({ uid: user.uid, groups: [] });
      setGroupError(err?.message || 'Failed to load group notifications');
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setQaState({ uid: null, posts: [] });
      return;
    }
    if (!isFirebaseConfigured()) {
      setQaState({ uid: user.uid, posts: [] });
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
        },
        (err) => {
          console.error('Failed to subscribe QA posts fallback for notifications', err);
          setQaState({ uid: user.uid, posts: [] });
          setQaError(err?.message || 'Failed to load QA notifications');
        }
      );

    unsub = subscribePrimary();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [user?.uid]);

  const groupNotis = useMemo(() => {
    const groups = user?.uid && groupState.uid === user.uid ? groupState.groups : [];
    return (Array.isArray(groups) ? groups : [])
      .filter((g) => g?.lastMessageAt)
      .filter((g) => {
        const type = g?.lastMessageType || 'text';
        const senderId = g?.lastMessageSenderId || null;
        if (type === 'system') {
          // Do not notify the actor about their own join/leave system message.
          if (senderId && senderId === user?.uid) return false;
          return true;
        }
        if (!senderId) return true;
        return senderId !== user?.uid;
      })
      .map((g) => {
        const messageId = g?.lastMessageId || null;
        const target = messageId
          ? `/groupmessage/${g.id}/m/${messageId}`
          : `/groupmessage/${g.id}`;

        return {
          id: `group-${g.id}-${messageId || 'latest'}`,
          kind: 'group',
          ts: toMillis(g.lastMessageAt),
          title: g.name || 'Group message',
          body: g.lastMessageText || 'New message',
          targetHash: target,
        };
      });
  }, [groupState, user?.uid]);

  const qaNotis = useMemo(() => {
    const posts = user?.uid && qaState.uid === user.uid ? qaState.posts : [];
    const items = [];
    (Array.isArray(posts) ? posts : []).forEach((p) => {
      const postId = p?.id;
      if (!postId) return;
      const title = p.question || p.subject || 'Q&A post';

      if (p.lastLikeAt && p.lastLikeById && p.lastLikeById !== user.uid) {
        items.push({
          id: `qa-like-${postId}`,
          kind: 'qa_like',
          ts: toMillis(p.lastLikeAt),
          title: 'New like',
          body: `${p.lastLikeByName || 'Someone'} liked your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }

      if (p.lastCommentAt && p.lastCommentById && p.lastCommentById !== user.uid) {
        items.push({
          id: `qa-comment-${postId}`,
          kind: 'qa_comment',
          ts: toMillis(p.lastCommentAt),
          title: 'New comment',
          body: `${p.lastCommentByName || 'Someone'} commented on your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }

      if (p.lastShareAt && p.lastShareById && p.lastShareById !== user.uid) {
        items.push({
          id: `qa-share-${postId}`,
          kind: 'qa_share',
          ts: toMillis(p.lastShareAt),
          title: 'New share',
          body: `${p.lastShareByName || 'Someone'} shared your post: ${title}`,
          targetHash: `/qa/${postId}`,
        });
      }
    });
    return items;
  }, [qaState, user?.uid]);

  const notis = useMemo(() => {
    const next = [...groupNotis, ...qaNotis]
      .filter((n) => n.ts)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 60);
    return next;
  }, [groupNotis, qaNotis]);

  const notisCount = useMemo(() => {
    const next = [...groupNotis, ...qaNotis]
      .filter((n) => n.ts)
      .sort((a, b) => b.ts - a.ts);
    return next.length;
  }, [groupNotis, qaNotis]);

  useEffect(() => {
    onCountChange?.(notisCount);
  }, [notisCount, onCountChange]);

  if (!isOpen) return null;

  return (
    <div className="notification-panel-overlay">
      <div className="notification-panel">
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
                  className="notification-item"
                  onClick={() => {
                    try {
                      window.location.hash = n.targetHash;
                    } catch {
                      // ignore
                    }
                    onClose?.();
                  }}
                >
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