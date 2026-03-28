// GroupMessagePanel.jsx
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import { subscribeToUserGroups } from './groupMessageApi';
import ChatWindow from './ChatWindow';
import './GroupMessagePanel.css';

const GroupMessagePanel = ({ onClose }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState(null);

  // Subscribe to user's groups
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const unsubscribe = subscribeToUserGroups(user.uid, (userGroups) => {
        setGroups(userGroups);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err.message);
      setLoading(false);
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
    <div className="group-message-panel-overlay">
      <div className="group-message-panel">
        <button className="back-button" onClick={onClose}>
          <FaArrowLeft />
        </button>
        <h2 className="panel-title">Group Message</h2>
        <div className="divider"></div>
        <div className="badge">
          <FaUsers />
          <span>Groups ({groups.length})</span>
        </div>

        <div className="chat-list">
          {error && (
            <div className="error-message" style={{ color: 'red', padding: '10px' }}>
              {error}
            </div>
          )}
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              Loading groups...
            </div>
          ) : groups.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
              No groups yet. Create or join a tutor post to see groups here!
            </div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                className="chat-card-btn"
                onClick={() => setSelectedGroupId(group.id)}
              >
                <div className="profile-outline">
                  {/* Profile outline */}
                </div>
                <div className="chat-content">
                  <p className="chat-subject">{group.name}</p>
                  <p className="chat-author">Subject: {group.subject}</p>
                  <p className="chat-members">Members: {group.memberCount || group.members?.length || 0}</p>
                  {group.ownerName && (
                    <p className="chat-owner">by {group.ownerName}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupMessagePanel;