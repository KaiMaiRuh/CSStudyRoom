// NotificationPanel.jsx
import React from 'react';
import { FaArrowLeft } from 'react-icons/fa';

const NotificationPanel = ({ onClose }) => {
  return (
    <div className="notification-panel-overlay">
      <div className="notification-panel">
        <button className="back-button" onClick={onClose}>
          <FaArrowLeft />
        </button>
        <div className="notification-content">
          <p>No notifications</p>
          <p>any new notifications will</p>
          <p>appear here</p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;