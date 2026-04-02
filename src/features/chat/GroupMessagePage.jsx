// GroupMessagePage.jsx - Full page group messaging
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import { userGroupReadsPath } from '../../api/dbSchema.js';
import {
  sendSharedPostMessage,
  subscribeToLatestGroupMessage,
  subscribeToUserGroups,
} from '../../api/chatService.js';
import ChatWindow from './ChatWindow';
import './GroupMessagePage.css';

const GroupMessagePage = ({ onBack }) => {
  const { user, profile } = useAuth();
  const [groupsState, setGroupsState] = useState({ uid: null, data: null });
  const [readsState, setReadsState] = useState({ uid: null, map: null });
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [error, setError] = useState(null);
  const [shareContext, setShareContext] = useState(null);
  const [latestMessagesByGroupId, setLatestMessagesByGroupId] = useState({});
  const [isLeavingPage, setIsLeavingPage] = useState(false);
  const leaveTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (leaveTimerRef.current) {
        window.clearTimeout(leaveTimerRef.current);
      }
    };
  }, []);

  const groups = useMemo(() => {
    return user?.uid && groupsState.uid === user.uid ? (Array.isArray(groupsState.data) ? groupsState.data : []) : [];
  }, [groupsState, user]);

  const loading = Boolean(user?.uid) && groupsState.uid !== user.uid;

  const groupsWithLatest = useMemo(() => {
    const base = Array.isArray(groups) ? groups : [];
    const next = base.map((group) => ({
      ...group,
      latestMessage: latestMessagesByGroupId[group.id] || null,
    }));

    next.sort((a, b) => {
      const timeA = a.latestMessage?.timestamp?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
      const timeB = b.latestMessage?.timestamp?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });

    return next;
  }, [groups, latestMessagesByGroupId]);

  // Subscribe to per-user read states for unread counters
  useEffect(() => {
    if (!user?.uid) return;
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const ref = collection(db, ...userGroupReadsPath(user.uid));
    return onSnapshot(
      ref,
      (snap) => {
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setReadsState({ uid: user.uid, map });
      },
      (err) => {
        console.error('Failed to subscribe group read states', err);
        setReadsState({ uid: user.uid, map: {} });
      }
    );
  }, [user?.uid]);

  const readsMap = useMemo(() => {
    return user?.uid && readsState.uid === user.uid ? (readsState.map && typeof readsState.map === 'object' ? readsState.map : {}) : {};
  }, [readsState, user]);

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
      groupIds.forEach((id) => {
        if (prev[id]) next[id] = prev[id];
      });
      return next;
    });

    const unsubs = groupIds.map((groupId) => {
      return subscribeToLatestGroupMessage(
        groupId,
        (latestMessage) => {
          setLatestMessagesByGroupId((prev) => ({
            ...prev,
            [groupId]: latestMessage,
          }));
        },
        (err) => {
          console.error('Failed to subscribe latest group message', groupId, err);
        }
      );
    });

    return () => {
      unsubs.forEach((unsub) => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [groups]);

  const unreadByGroupId = useMemo(() => {
    const next = {};
    groupsWithLatest.forEach((g) => {
      const lastReadMillis = readsMap?.[g.id]?.lastReadAt?.toMillis?.()
        || readsMap?.[g.id]?.updatedAt?.toMillis?.()
        || 0;
      const latestMillis = latestMessagesByGroupId[g.id]?.timestamp?.toMillis?.() || 0;

      // Legacy fallback for existing docs that still rely on messageCount counters.
      const legacyMessageCount = Number(g?.messageCount || 0);
      const legacyLastRead = Number(readsMap?.[g.id]?.lastReadMessageCount || 0);
      const legacyUnread = Math.max(0, legacyMessageCount - legacyLastRead);

      next[g.id] = latestMillis > lastReadMillis ? 1 : legacyUnread;
    });
    return next;
  }, [groupsWithLatest, latestMessagesByGroupId, readsMap]);

  // Subscribe to user's groups
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const unsubscribe = subscribeToUserGroups(user.uid, (userGroups) => {
        console.log('Groups loaded:', userGroups);
        setGroupsState({ uid: user.uid, data: userGroups });
        setError(null);
      });

      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('Error subscribing to groups:', err);
      // Avoid synchronous setState within effect body (eslint rule)
      Promise.resolve().then(() => {
        setGroupsState({ uid: user.uid, data: [] });
        setError(err?.message || 'Failed to load groups');
      });
    }
  }, [user?.uid]);

  // Parse hash route to support:
  // - #/groupmessage/{groupId} (open a group)
  // - #/groupmessage/share/{qa|tutor}/{postId} (share a post into a selected group)
  useEffect(() => {
    const parse = () => {
      const raw = String(window.location.hash || '').replace(/^#/, '');
      const path = (raw.split('?')[0]) || '/groupmessage';

      const shareMatch = path.match(/^\/groupmessage\/share\/(qa|tutor)\/([^/]+)$/);
      if (shareMatch) {
        setShareContext({ postType: shareMatch[1], postId: shareMatch[2] });
        return;
      }

      setShareContext(null);

      const messageMatch = path.match(/^\/groupmessage\/([^/]+)\/m\/([^/]+)$/);
      if (messageMatch) {
        setSelectedGroupId(messageMatch[1]);
        setSelectedMessageId(messageMatch[2]);
        return;
      }

      setSelectedMessageId(null);

      const groupMatch = path.match(/^\/groupmessage\/([^/]+)$/);
      if (groupMatch) {
        setSelectedGroupId(groupMatch[1]);
      }
      if (path === '/groupmessage') {
        setSelectedGroupId(null);
      }
    };

    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  // Extract origin query param from current hash to preserve across internal navigation
  const getOriginSuffix = () => {
    const raw = String(window.location.hash || '').replace(/^#/, '');
    const qIndex = raw.indexOf('?');
    if (qIndex === -1) return '';
    const params = new URLSearchParams(raw.slice(qIndex));
    const origin = params.get('origin');
    return origin ? `?origin=${encodeURIComponent(origin)}` : '';
  };

  const handleOpenGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedMessageId(null);
    try {
      window.location.hash = `/groupmessage/${groupId}${getOriginSuffix()}`;
    } catch {
      // ignore
    }
  };

  const handleCloseGroup = () => {
    setSelectedGroupId(null);
    setSelectedMessageId(null);
    try {
      window.location.hash = `/groupmessage${getOriginSuffix()}`;
    } catch {
      // ignore
    }
  };

  const handleBackToHome = () => {
    if (isLeavingPage) return;
    setIsLeavingPage(true);

    leaveTimerRef.current = window.setTimeout(() => {
      onBack?.();
    }, 220);
  };

  const handleShareToGroup = async (groupId) => {
    if (!shareContext) return;
    if (!user?.uid) {
      setError('Please log in to share');
      return;
    }

    const senderName = profile?.displayName || user.displayName || user.email || 'User';
    const senderAvatar = profile?.avatarUrl || user.photoURL || null;
    try {
      await sendSharedPostMessage({
        groupId,
        senderId: user.uid,
        senderName,
        senderAvatar,
        postType: shareContext.postType,
        postId: shareContext.postId,
      });
      handleOpenGroup(groupId);
    } catch (err) {
      console.error('Failed to share post into group', err);
      setError(err?.message || 'Failed to share post');
    }
  };

  if (selectedGroupId) {
    return (
      <ChatWindow
        groupId={selectedGroupId}
        initialMessageId={selectedMessageId}
        onClose={handleCloseGroup}
      />
    );
  }

  return (
    <div className={`group-message-page ${isLeavingPage ? 'gmp-leave' : 'gmp-enter'}`.trim()}>
      <div className="gmp-header">
        <button className="gmp-back-btn" onClick={handleBackToHome}>
          <FaArrowLeft />
        </button>
        <h1 className="gmp-title">Group Messages</h1>
      </div>

      <div className="gmp-content">
        {error && (
          <div className="gmp-error-msg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="gmp-loading">
            <p>Loading groups...</p>
          </div>
        ) : groupsWithLatest.length === 0 ? (
          <div className="gmp-empty-state">
            <FaPlus size={48} />
            <p>No groups yet</p>
            <span>Create or join a tutor post to start chatting</span>
          </div>
        ) : (
          <div className="gmp-groups-list">
            {groupsWithLatest.map((group, index) => {
              const latestMessage = latestMessagesByGroupId[group.id] || null;
              const latestText = latestMessage
                ? (latestMessage.type === 'share'
                  ? `Shared post: ${latestMessage.sharedPost?.title || latestMessage.text || ''}`
                  : (latestMessage.text || ''))
                : 'No messages yet';

              const latestDate = latestMessage?.timestamp?.toDate?.();
              const latestTime = latestDate ? latestDate.toLocaleString() : '';

              return (
                <button
                  key={group.id}
                  className="gmp-group-card"
                  style={{ '--gmp-index': index }}
                  onClick={() => {
                    if (shareContext) {
                      void handleShareToGroup(group.id);
                      return;
                    }
                    handleOpenGroup(group.id);
                  }}
                >
                  <div className="gmp-group-avatar">
                    {String(group.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="gmp-group-info">
                    <h3 className="gmp-group-name">{group.name}</h3>
                    <p className="gmp-group-subject">{group.subject}</p>
                    <p className="gmp-group-last-message">{latestText}</p>
                    <p className="gmp-group-meta">
                      {group.memberCount || group.members?.length || 0} members • by {group.owner?.displayName || group.ownerName || 'Unknown'}
                      {latestTime ? ` • ${latestTime}` : ''}
                    </p>
                  </div>
                  <div className="gmp-group-right">
                    {unreadByGroupId[group.id] > 0 ? (
                      <div className="gmp-unread-badge" aria-label={`${unreadByGroupId[group.id]} unread messages`}>
                        {unreadByGroupId[group.id] > 99 ? '99+' : unreadByGroupId[group.id]}
                      </div>
                    ) : null}
                    <div className="gmp-group-arrow">
                      <span>›</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMessagePage;
