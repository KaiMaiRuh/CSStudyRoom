// ChatWindow.jsx - Group chat interface
import React, { useState, useEffect, useRef } from 'react';
import { FaArrowLeft, FaTrashAlt, FaUserCircle } from 'react-icons/fa';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import {
  deleteGroupMessage,
  subscribeToGroupMessages,
  sendGroupMessage,
  getGroupById,
} from '../../api/chatService.js';
import { useUserProfiles } from '../../api/userService.js';
import './ChatWindow.css';

const ChatWindow = ({ groupId, initialMessageId = null, onClose }) => {
  const { user, isAdmin } = useAuth();
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const didScrollToInitialRef = useRef(false);
  const lastMarkedAtRef = useRef(0);

  const senderIds = React.useMemo(
    () => Array.from(new Set(messages.map((msg) => msg?.senderId).filter(Boolean))),
    [messages]
  );
  const senderProfiles = useUserProfiles(senderIds);

  const openUserProfile = (uid) => {
    if (!uid) return;
    try {
      window.location.hash = uid === user?.uid ? '/profile' : `/profile/${uid}`;
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    didScrollToInitialRef.current = false;
  }, [groupId, initialMessageId]);

  useEffect(() => {
    lastMarkedAtRef.current = 0;
  }, [groupId]);

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
  }, [groupId, initialMessageId]);

  // Subscribe to messages
  useEffect(() => {
    if (!groupId) return;

    const unsubscribe = subscribeToGroupMessages(groupId, (msgs) => {
      setMessages(msgs);
      // Auto-scroll to bottom when new messages arrive
      setTimeout(() => {
        if (initialMessageId && !didScrollToInitialRef.current) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [groupId, initialMessageId]);

  // Mark this group as read based on latest visible message timestamp.
  useEffect(() => {
    if (!user?.uid) return;
    if (!groupId) return;
    if (!isFirebaseConfigured()) return;

    const latestMessage = messages[messages.length - 1];
    const latestMillis = latestMessage?.timestamp?.toMillis?.() || 0;
    if (!latestMillis) return;
    if (latestMillis <= lastMarkedAtRef.current) return;
    lastMarkedAtRef.current = latestMillis;

    try {
      const { db } = getFirebaseServices();
      const ref = doc(db, 'users', user.uid, 'groupReads', groupId);
      void setDoc(
        ref,
        {
          lastReadAt: latestMessage.timestamp,
          lastReadMessageCount: messages.length,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to mark group as read', err);
    }
  }, [user?.uid, groupId, messages]);

  useEffect(() => {
    if (!initialMessageId) return;
    if (didScrollToInitialRef.current) return;
    const el = document.getElementById(`chat-msg-${initialMessageId}`);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      didScrollToInitialRef.current = true;
    } catch {
      // ignore
    }
  }, [messages, initialMessageId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!messageText.trim() || !user?.uid) {
      return;
    }

    setSending(true);
    try {
      await sendGroupMessage(groupId, user.uid, messageText);
      setMessageText('');
    } catch (err) {
      setError(err.message);
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (message) => {
    if (!groupId) return;
    if (!user?.uid) return;
    if (!message?.id) return;

    const isOwnMessage = message.senderId === user.uid;
    if (!isOwnMessage && !isAdmin) return;

    const ok = window.confirm('Delete this message?');
    if (!ok) return;

    try {
      setDeletingMessageId(message.id);
      await deleteGroupMessage({
        groupId,
        messageId: message.id,
        requesterId: user.uid,
        requesterIsAdmin: Boolean(isAdmin),
      });
    } catch (err) {
      setError(err?.message || 'Failed to delete message');
      console.error('Failed to delete message:', err);
    } finally {
      setDeletingMessageId(null);
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
                    <div key={msg.id} id={`chat-msg-${msg.id}`} className="chat-system-message">
                      <span>{msg.text}</span>
                    </div>
                  );
                } else {
                  // Regular message
                  const isShare = msg.type === 'share' && msg.sharedPost?.type && msg.sharedPost?.id;
                  const canDeleteMessage = Boolean(msg?.id) && (isOwnMessage || isAdmin);
                  const senderProfile = msg.senderId ? senderProfiles[msg.senderId] : null;
                  const avatarUrl = senderProfile?.avatarUrl || msg.senderAvatar || '';
                  const senderName = senderProfile?.username
                    ? `@${senderProfile.username}`
                    : (senderProfile?.displayName || msg.senderName || 'User');
                  elements.push(
                    <div
                      key={msg.id}
                      id={`chat-msg-${msg.id}`}
                      className={`chat-message ${isOwnMessage ? 'own' : 'other'}`}
                    >
                      {!isOwnMessage ? (
                        <button
                          type="button"
                          className="chat-avatar chat-avatar-btn"
                          aria-label="Open profile"
                          onClick={() => openUserProfile(msg.senderId)}
                          disabled={!msg.senderId}
                        >
                          {avatarUrl ? (
                            <img className="chat-avatar-img" src={avatarUrl} alt="" />
                          ) : (
                            <FaUserCircle className="chat-avatar-fallback" />
                          )}
                        </button>
                      ) : null}

                      <div className="chat-bubble-stack">
                        {!isOwnMessage ? (
                          <div className="chat-bubble-name">{senderName}</div>
                        ) : null}
                        <div
                          className={`chat-bubble ${isShare ? 'chat-bubble-share' : ''}`}
                          role={isShare ? 'button' : undefined}
                          tabIndex={isShare ? 0 : undefined}
                          onClick={() => {
                            if (!isShare) return;
                            try {
                              window.location.hash = `/${msg.sharedPost.type}/${msg.sharedPost.id}`;
                            } catch {
                              // ignore
                            }
                          }}
                          onKeyDown={(e) => {
                            if (!isShare) return;
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            try {
                              window.location.hash = `/${msg.sharedPost.type}/${msg.sharedPost.id}`;
                            } catch {
                              // ignore
                            }
                          }}
                        >
                          {isShare ? (
                            <>
                              Shared post: {msg.sharedPost.title || msg.text}
                              {msg.sharedPost.subject ? ` (${msg.sharedPost.subject})` : ''}
                            </>
                          ) : (
                            msg.text
                          )}
                        </div>
                        <div className="chat-message-actions">
                          {msg.timestamp && (
                            <div className="chat-bubble-time">
                              {msgDate?.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                          {canDeleteMessage ? (
                            <button
                              type="button"
                              className="chat-message-delete"
                              aria-label="Delete message"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteMessage(msg);
                              }}
                              disabled={deletingMessageId === msg.id}
                              style={deletingMessageId === msg.id ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                            >
                              <FaTrashAlt />
                            </button>
                          ) : null}
                        </div>
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
