// FloatingMenu.jsx
import React, { useState } from 'react';
import { FaBell, FaEnvelope, FaPlus } from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';
import './FloatingMenu.css';

const FloatingMenu = ({
  onCreatePost,
  onNavigate,
  isGroupMessagePage,
  hideCreatePost = false,
  hideNotification = false,
  hideGroupMessage = false,
}) => {
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = (panelType) => {
    setActivePanel(panelType);
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  const handleMessage = () => {
    if (typeof onNavigate === 'function') {
      // If already on group message page, go back to home
      if (isGroupMessagePage) {
        onNavigate('home');
      } else {
        onNavigate('groupmessage');
      }
    }
  };

  return (
    <div>
      {/* Floating Action Button Menu */}
      <div className="floating-menu">
        {!hideNotification ? (
          <button 
            className="fab-button notification-btn"
            onClick={() => openPanel('notification')}
          >
            <FaBell />
          </button>
        ) : null}

        {!hideGroupMessage ? (
          <button 
            className="fab-button message-btn"
            onClick={handleMessage}
          >
            <FaEnvelope />
          </button>
        ) : null}
        {!hideCreatePost ? (
          <button
            className="fab-button create-btn"
            onClick={() => {
              if (typeof onCreatePost === 'function') {
                onCreatePost();
              } else {
                window.location.hash = '#/create-post';
              }
            }}
          >
            <FaPlus />
          </button>
        ) : null}
      </div>

      {/* Overlay Panels */}
      {activePanel === 'notification' && (
        <NotificationPanel onClose={closePanel} />
      )}
    </div>
  );
};

export default FloatingMenu;