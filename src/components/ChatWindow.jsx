// ChatWindow.jsx - Group chat interface
import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaTimes } from 'react-icons/fa';
import { useAuth } from '../auth/AuthContext';
import {
  subscribeToGroupMessages,
  sendGroupMessage,
  getGroupById,
} from './groupMessageApi';
import './ChatWindow.css';

const ChatWindow = ({ groupId, onClose }) => {
  const { user, profile } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Load group info
  useEffect(() => {
    let isMounted = true;

    const loadGroup = async () => {
      try {
        const groupData = await getGroupById(groupId);
        if (isMounted) {
          setGroup(groupData);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    loadGroup();
    return () => {
      isMounted = false;
    };
  }, [groupId]);

  // Subscribe to messages
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = subscribeToGroupMessages(groupId, (msgs) => {
      setMessages(msgs);
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() || !user?.uid || !profile?.displayName) {
      return;
    }

    setSending(true);
    try {
      await sendGroupMessage(
        groupId,
        user.uid,
        profile.displayName,
        messageText
      );
      setMessageText('');
    } catch (err) {
      setError(err.message);
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="chat-window-overlay">
        <div className="chat-window">
          <div className="chat-header">
            <button className="back-btn" onClick={onClose}>
              <FaArrowLeft />
            </button>
            <h2>Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="chat-window-overlay">
        <div className="chat-window">
          <div className="chat-header">
            <button className="back-btn" onClick={onClose}>
              <FaArrowLeft />
            </button>
            <h2>Group not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window-overlay">
      <div className="chat-window">
        <div className="chat-header">
          <button className="back-btn" onClick={onClose}>
            <FaArrowLeft />
          </button>
          <div className="chat-title-section">
            <h2>{group.name}</h2>
            <p className="chat-members-count">{group.memberCount || group.members?.length || 0} members</p>
          </div>
        </div>

        <div className="chat-warning-banner">
          <p>💭 โปรดสื่อสารด้วยความสุภาพและเคารพซึ่งกันและกัน</p>
        </div>

        <div className="chat-messages">
          {error && (
            <div className="chat-error-msg">
              {error}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="chat-empty-state">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            (() => {
              let lastDate = null;
              return messages.map((msg, index) => {
                const elements = [];
                const isOwnMessage = msg.senderId === user?.uid;
                const msgDate = msg.timestamp ? new Date(msg.timestamp.toMillis?.() || 0) : null;
                const msgDateString = msgDate ? msgDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null;

                // Show date separator if date changed or first message
                if (msgDateString && msgDateString !== lastDate) {
                  elements.push(
                    <div key={`date-${index}`} className="chat-date-separator">
                      <span>{msgDateString}</span>
                    </div>
                  );
                  lastDate = msgDateString;
                }

                // System message (join notification)
                if (msg.type === 'system') {
                  elements.push(
                    <div key={msg.id} className="chat-system-message">
                      <span>{msg.text}</span>
                    </div>
                  );
                } else {
                  // Regular message
                  elements.push(
                    <div
                      key={msg.id}
                      className={`chat-message ${isOwnMessage ? 'own' : 'other'}`}
                    >
                      <div className="message-content">
                        <p className="message-sender">{msg.senderName}</p>
                        <p className="message-text">{msg.text}</p>
                        {msg.timestamp && (
                          <span className="message-time">
                            {msgDate?.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return elements;
              }).flat();
            })()
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="chat-input"
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!messageText.trim() || sending}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
