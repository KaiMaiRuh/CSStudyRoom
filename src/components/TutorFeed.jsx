/* TutorFeed component */
import React, { useEffect, useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt } from 'react-icons/fa';
import './TutorFeed.css';
import TutorPostDetail from './TutorPostDetail';
import ImagePreviewModal from './ImagePreviewModal';
import { useAuth } from '../auth/AuthContext';

const TutorFeed = ({ posts = [], openPostId = null, onDetailOpen, onDetailClose, canDelete = false, onDeletePost }) => {
  const { user, profile } = useAuth();
  const [selectedPost, setSelectedPost] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);

  const getUniqueJoiners = (post) => {
    const joiners = Array.isArray(post?.joiners) ? post.joiners : [];
    const ownerUid = post?.user?.uid || post?.authorId || null;
    const unique = new Map();

    joiners.forEach((joiner) => {
      const uid = joiner?.uid || joiner?.id;
      if (!uid) return;
      if (uid === ownerUid) return; // don't treat owner as joiner
      if (!unique.has(uid)) {
        unique.set(uid, {
          uid,
          name: joiner?.name || joiner?.displayName || joiner?.displayName || 'Unknown',
          avatar: joiner?.avatar || joiner?.photoURL || joiner?.avatarUrl || '',
        });
      }
    });

    return Array.from(unique.values());
  };

  const handleOpenDetail = (post) => {
    const id = post?.id || null;
    if (id) {
      try {
        window.location.hash = `/tutor/${id}`;
      } catch {
        // ignore
      }
    }

    setSelectedPost(post);
    onDetailOpen?.();
  };

  const handleCloseDetail = () => {
    try {
      window.location.hash = '/tutor';
    } catch {
      // ignore
    }
    setSelectedPost(null);
    onDetailClose?.();
  };

  useEffect(() => {
    // Clear selected post when opening a different post or closing detail view
    if (!openPostId) {
      return;
    }

    if (selectedPost?.id === openPostId) return;

    const found = (Array.isArray(posts) ? posts : []).find((p) => p?.id === openPostId) || { id: openPostId };
    Promise.resolve().then(() => {
      setSelectedPost(found);
      onDetailOpen?.();
    });
  }, [openPostId, posts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effect to handle cleanup when openPostId is cleared
  useEffect(() => {
    if (!openPostId && selectedPost) {
      Promise.resolve().then(() => {
        setSelectedPost(null);
        onDetailClose?.();
      });
    }
  }, [openPostId, selectedPost]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const joined = getUniqueJoiners(selectedPost);
    const detailPost = {
      ...selectedPost,
      joinedCount: joined.length + 1, // include creator as joined
      joiners: joined,
    };
    return (
      <TutorPostDetail
        post={detailPost}
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

  return (
    <div className="tutor-feed">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
      {posts.map(post => {
        const joiners = getUniqueJoiners(post);
        const actualJoinedCount = joiners.length + 1; // include creator as joined
        return (
        <div key={post.id} className="tutor-card">
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
              <h3 className="post-title">{post.title}</h3>
              <p className="post-description">{post.description}</p>
              <div className="date-time">
                <span className="date">{post.date}{post.time ? ` เวลา ${post.time}` : ''}</span>
                <span className="ago">{formatPostedTime(post.minutesAgo)}</span>
              </div>
              <div className="subject-by">
                <span className="subject">{post.subject}</span>
                <span className="by-name">
                  By {post.user?.uid === user?.uid
                    ? (profile?.username ? `@${profile.username}` : (profile?.displayName || post.user?.displayName || post.user?.name || 'Unknown'))
                    : (post.user?.username ? `@${post.user.username}` : (post.user?.displayName || post.user?.name || 'Unknown'))}
                </span>
              </div>
              <div className="location">
                <FaMapMarkerAlt style={{ marginRight: 6 }} /> {post.location}
              </div>
            </div>
          </div>
          
          <div className="card-content">
            {Array.isArray(post.images) && post.images.length > 0 ? (
              <div className="tutor-feed-images">
                {post.images.slice(0, 3).map((imageUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Open image ${index + 1}`}
                    onClick={() => setPreviewSrc(imageUrl)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                    }}
                  >
                    <img className="tutor-feed-image" src={imageUrl} alt="" />
                  </button>
                ))}
                {post.images.length > 3 && (
                  <div className="more-images-indicator">
                    +{post.images.length - 3} more
                  </div>
                )}
              </div>
            ) : post.imageUrl ? (
              <button
                type="button"
                aria-label="Open image"
                onClick={() => setPreviewSrc(post.imageUrl)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  width: '100%',
                  cursor: 'pointer',
                }}
              >
                <img className="tutor-feed-image" src={post.imageUrl} alt="" />
              </button>
            ) : null}
          </div>
          
          <div className="card-footer">
            <div className="capacity">
              เข้าร่วมแล้ว: {actualJoinedCount}/{post.capacity} คน
            </div>
            <div className="tutor-card-actions">
              <button className="read-more-button" type="button" onClick={() => handleOpenDetail(post)}>
                Read more
              </button>
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
        </div>
        );
      })}
    </div>
  );
};

export default TutorFeed;