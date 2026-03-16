// FloatingMenu.jsx
import React, { useState } from 'react';
import { FaBell, FaEnvelope, FaPlus } from 'react-icons/fa';
import NotificationPanel from './NotificationPanel';
import GroupMessagePanel from './GroupMessagePanel';
import './FloatingMenu.css';

const FloatingMenu = ({ onCreatePost }) => {
  const [activePanel, setActivePanel] = useState(null);

  const openPanel = (panelType) => {
    setActivePanel(panelType);
  };

  const closePanel = () => {
    setActivePanel(null);
  };

  return (
    <div>
      {/* Floating Action Button Menu */}
      <div className="floating-menu">
        <button 
          className="fab-button notification-btn"
          onClick={() => openPanel('notification')}
        >
          <FaBell />
        </button>
        <button 
          className="fab-button message-btn"
          onClick={() => openPanel('message')}
        >
          <FaEnvelope />
        </button>
        <button
          className="fab-button create-btn"
          onClick={() => {
            if (typeof onCreatePost === 'function') {
              onCreatePost();
            } else {
              window.location.hash = '#create-post';
            }
          }}
        >
          <FaPlus />
        </button>
      </div>

      {/* Overlay Panels */}
      {activePanel === 'notification' && (
        <NotificationPanel onClose={closePanel} />
      )}
      
      {activePanel === 'message' && (
        <GroupMessagePanel onClose={closePanel} />
      )}
    </div>
  );
};

export default FloatingMenu;