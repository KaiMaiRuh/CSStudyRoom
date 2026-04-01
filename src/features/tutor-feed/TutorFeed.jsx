/* TutorFeed component */
import React, { useEffect, useRef, useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt, FaTrashAlt } from 'react-icons/fa';
import './TutorFeed.css';
import TutorPostDetail from './TutorPostDetail';
import ImagePreviewModal from '../../components/common/ImagePreviewModal.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

const TutorFeed = ({
  posts = [],
  openPostId = null,
  detailBackHash = null,
  onDetailOpen,
  onDetailClose,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  canDelete = false,
  onDeletePost,
}) => {
  const { user, profile } = useAuth();
  const [selectedPost, setSelectedPost] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const loadMoreRef = useRef(null);
  const observerBusyRef = useRef(false);

  const scrollWindowToTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      window.scrollTo(0, 0);
    }
  };

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
    scrollWindowToTop();

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
      window.location.hash = detailBackHash ? detailBackHash.replace(/^#/, '') : '/tutor';
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
      scrollWindowToTop();
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

  const getPostAuthorName = (post) => {
    const fallback = post.user?.displayName || post.user?.name || post.user?.username || 'Unknown';
    const authorUid = post.user?.uid || post.authorId || null;

    if (!authorUid || !user?.uid || authorUid !== user.uid) {
      return fallback;
    }

    return profile?.displayName || profile?.name || user.displayName || fallback;
  };

  useEffect(() => {
    if (!hasMore) return;
    if (isLoadingMore) return;
    if (typeof onLoadMore !== 'function') return;

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (observerBusyRef.current) return;

        observerBusyRef.current = true;
        void Promise.resolve(onLoadMore()).finally(() => {
          observerBusyRef.current = false;
        });
      },
      {
        root: null,
        rootMargin: '240px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, onLoadMore, posts.length]);

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
          {canDelete ? (
            <button
              className="admin-delete-icon-btn"
              type="button"
              aria-label="Delete post"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePost?.(post);
              }}
            >
              <FaTrashAlt />
            </button>
          ) : null}

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
                <span className="tutor-date-blue">{post.date} {post.time && `at ${post.time}`}</span>
                <span className="ago">{formatPostedTime(post.minutesAgo)}</span>
              </div>
              <div className="subject-by">
                <span className="subject">{post.subject}</span>
                <span className="by-name">By {getPostAuthorName(post)}</span>
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
              Joined: {actualJoinedCount}/{post.capacity} people
            </div>
            <div className="tutor-card-actions">
              <button className="read-more-button" type="button" onClick={() => handleOpenDetail(post)}>
                Read more
              </button>
            </div>
          </div>
        </div>
        );
      })}

      <div ref={loadMoreRef} style={{ height: 1 }} aria-hidden="true" />
      {isLoadingMore ? (
        <div style={{ textAlign: 'center', color: '#6b7280', padding: '10px 0 20px' }}>Loading more posts...</div>
      ) : null}
    </div>
  );
};

export default TutorFeed;