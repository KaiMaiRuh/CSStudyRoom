/* QAFeed component */
import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
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

const QAFeed = ({ posts = [], openPostId = null, onDetailOpen, onDetailClose, canDelete = false, onDeletePost }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [busyPostId, setBusyPostId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const { user, profile } = useAuth();

  const getPostAuthorName = (post) => {
    const fallback = post.user?.displayName || post.user?.name || post.authorName || 'Unknown';
    const otherLabel = post.user?.username ? `@${post.user.username}` : fallback;
    if (!post.authorId || !user?.uid) return otherLabel;
    if (post.authorId === user.uid) {
      return profile?.username ? `@${profile.username}` : (profile?.displayName || user.displayName || otherLabel);
    }
    return otherLabel;
  };

  const handleOpenDetail = (post) => {
    const id = post?.id || null;
    if (id) {
      try {
        window.location.hash = `/qa/${id}`;
      } catch {
        // ignore
      }
    }
    setSelectedPost(post);
    onDetailOpen?.();
  };

  const handleCloseDetail = () => {
    try {
      window.location.hash = '/qa';
    } catch {
      // ignore
    }
    setSelectedPost(null);
    onDetailClose?.();
  };

  useEffect(() => {
    if (!openPostId) {
      if (selectedPost) {
        setSelectedPost(null);
        onDetailClose?.();
      }
      return;
    }

    if (selectedPost?.id === openPostId) return;
    const found = (Array.isArray(posts) ? posts : []).find((p) => p?.id === openPostId) || { id: openPostId };
    setSelectedPost(found);
    onDetailOpen?.();
  }, [openPostId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const getPostImages = (post) => {
    const imagesFromList = Array.isArray(post.images)
      ? post.images.filter((src) => typeof src === 'string' && src.trim())
      : [];
    const fallbackImage = typeof post.imageUrl === 'string' && post.imageUrl.trim() ? [post.imageUrl] : [];
    const merged = [...imagesFromList, ...fallbackImage];

    // keep the order stable and avoid duplicated URLs
    return Array.from(new Set(merged));
  };

  if (selectedPost) {
    return (
      <QAPostDetail
        post={selectedPost}
        onBack={handleCloseDetail}
        onDelete={
          canDelete
            ? () => {
                onDeletePost?.(selectedPost);
                handleCloseDetail();
              }
            : undefined
        }
      />
    );
  }

  const handleToggleLike = async (postId) => {
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) {
      alert('Please log in to like posts');
      return;
    }

    try {
      setBusyPostId(postId);
      const { db } = getFirebaseServices();
      await toggleQaPostLike({
        db,
        postId,
        uid: user.uid,
        authorName: profile?.username ? `@${profile.username}` : (user.displayName || user.email || 'User'),
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
              aria-label="Open profile"
              onClick={(e) => {
                e.stopPropagation();
                const uid = post.user?.uid || post.authorId || null;
                if (!uid) return;
                try {
                  window.location.hash = uid === user?.uid ? '/profile' : `/profile/${uid}`;
                } catch {
                  // ignore
                }
              }}
              style={{ background: 'white', border: '2px solid #1a2b48', padding: 0, cursor: post.user?.uid || post.authorId ? 'pointer' : 'default' }}
            >
              {post.user?.avatar ? (
                <img className="feed-avatar-img" src={post.user.avatar} alt="" />
              ) : (
                <FaUserCircle className="avatar-icon" />
              )}
            </button>
            <div className="post-info">
              <div className="post-meta-name">
                {getPostAuthorName(post)}
              </div>
              <div className="post-meta-ago">
                {formatPostedTime(post.minutesAgo)}
              </div>
              <div className="post-meta-subject">
                {post.subject || 'No subject'}
              </div>
            </div>
          </div>
          
          <div className="card-content">
            <h3 className="question-text">{post.question}</h3>
            {(() => {
              const postImages = getPostImages(post);
              if (postImages.length === 0) return null;

              const previewImages = postImages.slice(0, 4);
              const extraImageCount = postImages.length - previewImages.length;

              return (
                <div className="qa-feed-image-grid">
                  {previewImages.map((imageSrc, index) => {
                    const isOverflowTile = index === 3 && extraImageCount > 0;
                    return (
                      <button
                        key={`${post.id}-img-${index}`}
                        type="button"
                        className="qa-feed-image-tile"
                        aria-label={isOverflowTile ? 'Open post detail' : `Open image ${index + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isOverflowTile) {
                            handleOpenDetail(post);
                            return;
                          }
                          setPreviewSrc(imageSrc);
                        }}
                      >
                        <img className="qa-feed-image" src={imageSrc} alt="" />
                        {isOverflowTile ? (
                          <span className="qa-feed-image-more">+{extraImageCount}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
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
                <span
                  className="action-icon"
                  role="button"
                  tabIndex={0}
                  aria-label="Share"
                  onClick={() => {
                    if (!user?.uid) {
                      alert('Please log in to share posts');
                      return;
                    }
                    try {
                      window.location.hash = `/groupmessage/share/qa/${post.id}`;
                    } catch {
                      // ignore
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ' ') return;
                    if (!user?.uid) {
                      alert('Please log in to share posts');
                      return;
                    }
                    try {
                      window.location.hash = `/groupmessage/share/qa/${post.id}`;
                    } catch {
                      // ignore
                    }
                  }}
                >
                  <FaShare />
                </span>
                <span className="action-count">{post.shares ?? 0}</span>
              </div>
            </div>

            {canDelete ? (
              <button
                className="delete-post-button"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePost?.(post);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default QAFeed;