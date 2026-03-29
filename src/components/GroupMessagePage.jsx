// GroupMessagePage.jsx - Full page group messaging
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { subscribeToUserGroups } from './groupMessageApi';
import ChatWindow from './ChatWindow';
import './GroupMessagePage.css';

const GroupMessagePage = ({ onBack }) => {
  const { user } = useAuth();
  const [groupsState, setGroupsState] = useState({ uid: null, data: null });
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState(null);

  const groups = user?.uid && groupsState.uid === user.uid ? groupsState.data || [] : [];
  const loading = Boolean(user?.uid) && groupsState.uid !== user.uid;

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

  if (selectedGroupId) {
    return (
      <ChatWindow
        groupId={selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
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
                onClick={() => setSelectedGroupId(group.id)}
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
                <div className="gmp-group-arrow">
                  <span>›</span>
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
