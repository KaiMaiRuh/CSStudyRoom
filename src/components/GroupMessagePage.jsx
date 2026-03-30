// GroupMessagePage.jsx - Full page group messaging
import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { sendSharedPostMessage, subscribeToUserGroups } from './groupMessageApi';
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

  const groups = useMemo(() => {
    return user?.uid && groupsState.uid === user.uid ? (Array.isArray(groupsState.data) ? groupsState.data : []) : [];
  }, [groupsState, user]);

  const loading = Boolean(user?.uid) && groupsState.uid !== user.uid;

  // Subscribe to per-user read states for unread counters
  useEffect(() => {
    if (!user?.uid) return;
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const ref = collection(db, 'users', user.uid, 'groupReads');
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

  const unreadByGroupId = useMemo(() => {
    const next = {};
    (Array.isArray(groups) ? groups : []).forEach((g) => {
      const messageCount = Number(g?.messageCount || 0);
      const lastRead = Number(readsMap?.[g.id]?.lastReadMessageCount || 0);
      const unread = Math.max(0, messageCount - lastRead);
      next[g.id] = unread;
    });
    return next;
  }, [groups, readsMap]);

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
      const path = raw || '/groupmessage';

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

  const handleOpenGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedMessageId(null);
    try {
      window.location.hash = `/groupmessage/${groupId}`;
    } catch {
      // ignore
    }
  };

  const handleCloseGroup = () => {
    setSelectedGroupId(null);
    setSelectedMessageId(null);
    try {
      window.location.hash = '/groupmessage';
    } catch {
      // ignore
    }
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
    <div className="group-message-page">
      <div className="gmp-header">
        <button className="gmp-back-btn" onClick={onBack}>
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
        ) : groups.length === 0 ? (
          <div className="gmp-empty-state">
            <FaPlus size={48} />
            <p>No groups yet</p>
            <span>Create or join a tutor post to start chatting</span>
          </div>
        ) : (
          <div className="gmp-groups-list">
            {groups.map(group => (
              <button
                key={group.id}
                className="gmp-group-card"
                onClick={() => {
                  if (shareContext) {
                    void handleShareToGroup(group.id);
                    return;
                  }
                  handleOpenGroup(group.id);
                }}
              >
                <div className="gmp-group-avatar">
                  {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="gmp-group-info">
                  <h3 className="gmp-group-name">{group.name}</h3>
                  <p className="gmp-group-subject">{group.subject}</p>
                  <p className="gmp-group-meta">
                    {group.memberCount || group.members?.length || 0} members • by {group.ownerName || 'Unknown'}
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMessagePage;
