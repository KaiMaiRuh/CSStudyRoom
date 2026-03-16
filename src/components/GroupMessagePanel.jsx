// GroupMessagePanel.jsx
import React from 'react';
import { FaArrowLeft, FaUsers } from 'react-icons/fa';

const GroupMessagePanel = ({ onClose }) => {
  // Sample chat data
  const chats = [
    {
      id: 1,
      date: "Friday, 27 February 2026, 5:00 PM",
      subject: "Algorithm",
      author: "Gu eng"
    },
    {
      id: 2,
      date: "Thursday, 26 February 2026, 3:30 PM",
      subject: "Software Engineering",
      author: "Prof. Thuai"
    },
    {
      id: 3,
      date: "Wednesday, 25 February 2026, 2:15 PM",
      subject: "Intelligent System",
      author: "Dr. Sukhid"
    }
  ];

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
          <span>Groups</span>
        </div>
        <div className="chat-list">
          {chats.map(chat => (
            <div key={chat.id} className="chat-card">
              <div className="profile-outline">
                {/* Profile outline would be implemented with CSS */}
              </div>
              <div className="chat-content">
                <p className="chat-date">{chat.date}</p>
                <p className="chat-subject">{chat.subject}</p>
                <p className="chat-author">by {chat.author}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GroupMessagePanel;