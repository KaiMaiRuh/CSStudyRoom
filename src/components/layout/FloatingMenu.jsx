// FloatingMenu.jsx
import React, { useEffect, useState } from 'react';
import { FaBell, FaEnvelope, FaPlus } from 'react-icons/fa';
import NotificationPanel from '../common/NotificationPanel.jsx';
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [routeHashPath, setRouteHashPath] = useState(
    () => String(window.location.hash || '').replace(/^#/, '')
  );

  useEffect(() => {
    const handleHashChange = () => {
      const nextPath = String(window.location.hash || '').replace(/^#/, '');
      setRouteHashPath(nextPath);

      if (/^\/groupmessage\/[^/]+(?:\/m\/[^/]+)?$/.test(nextPath)) {
        setActivePanel(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isGroupChatRoomRoute = /^\/groupmessage\/[^/]+(?:\/m\/[^/]+)?$/.test(routeHashPath);

  const hideNotificationButton = hideNotification || isGroupChatRoomRoute;
  const hideGroupMessageButton = hideGroupMessage || isGroupChatRoomRoute;
  const hideCreatePostButton = hideCreatePost || isGroupChatRoomRoute;

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
        {!hideNotificationButton ? (
          <button 
            className="fab-button notification-btn"
            onClick={() => openPanel('notification')}
          >
            <FaBell />
            {notificationCount > 0 ? (
              <span className="fab-badge" aria-label={`Notifications: ${notificationCount}`}>
                {notificationCount > 99 ? '99+' : String(notificationCount)}
              </span>
            ) : null}
          </button>
        ) : null}

        {!hideGroupMessageButton ? (
          <button 
            className="fab-button message-btn"
            onClick={handleMessage}
          >
            <FaEnvelope />
          </button>
        ) : null}
        {!hideCreatePostButton ? (
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

      {/* Notification overlay panel (kept mounted to maintain live count) */}
      {!hideNotificationButton ? (
        <NotificationPanel
          isOpen={activePanel === 'notification'}
          onClose={closePanel}
          onCountChange={setNotificationCount}
        />
      ) : null}
    </div>
  );
};

export default FloatingMenu;