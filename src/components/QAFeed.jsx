/* QAFeed component */
import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaCamera, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import './QAFeed.css';
import QAPostDetail from './QAPostDetail';
import ImagePreviewModal from './ImagePreviewModal';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { subscribeQaPostLikeStatus, toggleQaPostLike } from './qaPostApi';

const QALikeAction = ({ postId, busy, onToggle }) => {
  const { user } = useAuth();
  const [likeState, setLikeState] = useState({ uid: null, liked: false });

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (!postId) return;

    if (!user?.uid) return;

    const { db } = getFirebaseServices();
    return subscribeQaPostLikeStatus(
      db,
      postId,
      user.uid,
      (next) => setLikeState({ uid: user.uid, liked: Boolean(next) }),
      (err) => console.error('Failed to subscribe qaPost like status', err)
    );
  }, [postId, user?.uid]);

  const liked = user?.uid && likeState.uid === user.uid ? likeState.liked : false;

  return (
    <span
      className={`action-icon ${liked ? 'action-icon-liked' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Like"
      aria-pressed={liked}
      onClick={() => onToggle(postId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle(postId);
      }}
      style={busy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      <FaThumbsUp />
    </span>
  );
};

const QAFeed = ({ posts = [], onDetailOpen, onDetailClose }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [busyPostId, setBusyPostId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const { user } = useAuth();

  const handleOpenDetail = (post) => {
    setSelectedPost(post);
    onDetailOpen?.();
  };

  const handleCloseDetail = () => {
    setSelectedPost(null);
    onDetailClose?.();
  };

  const formatPostedTime = (minutesAgo) => {
    if (minutesAgo == null || Number.isNaN(minutesAgo)) return '';
    const mins = Number(minutesAgo);
    if (mins < 60) return `posted ${mins} mins ago`;
    if (mins < 1440) {
      const hours = Math.floor(mins / 60);
      return `posted ${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`;
    }
    const days = Math.floor(mins / 1440);
    return `posted ${days} ${days === 1 ? 'day' : 'days'} ago`;
  };

  if (selectedPost) {
    return <QAPostDetail post={selectedPost} onBack={handleCloseDetail} />;
  }

  const handleToggleLike = async (postId) => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      setBusyPostId(postId);
      const { db } = getFirebaseServices();
      await toggleQaPostLike({
        db,
        postId,
        uid: user.uid,
        authorName: user.displayName || user.email || 'User',
      });
    } catch (err) {
      console.error('Failed to toggle like', err);
      alert(err?.message || 'Failed to like post');
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <div className="qa-feed">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
      {posts.map(post => (
        <div
          key={post.id}
          className="qa-card"
          role="button"
          tabIndex={0}
          onClick={() => handleOpenDetail(post)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleOpenDetail(post);
          }}
        >
          <div className="card-header">
            <button
              type="button"
              className="profile-circle"
              aria-label="Open profile image"
              onClick={(e) => {
                e.stopPropagation();
                if (post.user?.avatar) setPreviewSrc(post.user.avatar);
              }}
              disabled={!post.user?.avatar}
              style={{ background: 'white', border: '2px solid #1a2b48', padding: 0, cursor: post.user?.avatar ? 'pointer' : 'default' }}
            >
              {post.user?.avatar ? (
                <img className="feed-avatar-img" src={post.user.avatar} alt="" />
              ) : (
                <FaUserCircle className="avatar-icon" />
              )}
            </button>
            <div className="post-info">
              <div className="date-time">
                <span className="date">{post.date}</span>
                <span className="time">เวลา {post.time}</span>
                <span className="ago">{formatPostedTime(post.minutesAgo)}</span>
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <div className="subject-tag">{post.subject}</div>
            <h3 className="question-text">{post.question}</h3>
            {Array.isArray(post.images) && post.images.length > 0 ? (
              <button
                type="button"
                aria-label="Open image"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewSrc(post.images[0]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                <img className="qa-feed-image" src={post.images[0]} alt="" />
              </button>
            ) : post.imageUrl ? (
              <button
                type="button"
                aria-label="Open image"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewSrc(post.imageUrl);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                <img className="qa-feed-image" src={post.imageUrl} alt="" />
              </button>
            ) : (
              <div className="image-placeholder">
                <FaCamera style={{ marginRight: 8 }} />
                <span>Image preview</span>
              </div>
            )}
          </div>
          
          <div className="card-footer">
            <div className="action-bar" onClick={(e) => e.stopPropagation()}>
              <div className="action-with-count">
                <QALikeAction
                  postId={post.id}
                  busy={busyPostId === post.id}
                  onToggle={handleToggleLike}
                />
                <span className="action-count">{post.likes ?? 0}</span>
              </div>

              <div className="action-with-count" role="button" tabIndex={0} onClick={() => handleOpenDetail(post)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenDetail(post); }}>
                <span className="action-icon" aria-label="Comment"><FaComment /></span>
                <span className="action-count">{post.comments ?? 0}</span>
              </div>

              <div className="action-with-count">
                <span className="action-icon" aria-label="Share"><FaShare /></span>
                <span className="action-count">{post.shares ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QAFeed;