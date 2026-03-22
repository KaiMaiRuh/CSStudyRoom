/* QAFeed component */
import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaCamera, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import './QAFeed.css';
import QAPostDetail from './QAPostDetail';
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
  const { user } = useAuth();

  const handleOpenDetail = (post) => {
    setSelectedPost(post);
    onDetailOpen?.();
  };

  const handleCloseDetail = () => {
    setSelectedPost(null);
    onDetailClose?.();
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
            <div className="profile-circle"><FaUserCircle className="avatar-icon" /></div>
            <div className="post-info">
              <div className="date-time">
                <span className="date">{post.date}</span>
                <span className="time">เวลา {post.time}</span>
                <span className="ago">posted {post.minutesAgo} mins ago</span>
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <div className="subject-tag">{post.subject}</div>
            <h3 className="question-text">{post.question}</h3>
            <div className="image-placeholder">
              <FaCamera style={{ marginRight: 8 }} />
              <span>Image preview</span>
            </div>
          </div>
          
          <div className="card-footer">
            <div className="action-bar" onClick={(e) => e.stopPropagation()}>
              <QALikeAction
                postId={post.id}
                busy={busyPostId === post.id}
                onToggle={handleToggleLike}
              />
              <span
                className="action-icon"
                role="button"
                tabIndex={0}
                aria-label="Comment"
                onClick={() => handleOpenDetail(post)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleOpenDetail(post);
                }}
              >
                <FaComment />
              </span>
              <span className="action-icon"><FaShare /></span>
            </div>
            <div className="stats">
              <span>{post.likes} likes</span>
              <span>{post.comments} comments</span>
              <span>{post.shares} shares</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QAFeed;