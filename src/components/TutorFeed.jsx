/* TutorFeed component */
import React, { useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt } from 'react-icons/fa';
import './TutorFeed.css';
import TutorPostDetail from './TutorPostDetail';
import ImagePreviewModal from './ImagePreviewModal';

const TutorFeed = ({ posts = [], onDetailOpen, onDetailClose, canDelete = false, onDeletePost }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);

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
    const actualJoinedCount = 1 + (Array.isArray(selectedPost.joiners) ? selectedPost.joiners.length : 0);
    const detailPost = {
      ...selectedPost,
      joinedCount: actualJoinedCount,
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
        // Calculate actual joined count from joiners array + creator (1)
        const actualJoinedCount = 1 + (Array.isArray(post.joiners) ? post.joiners.length : 0);
        return (
        <div key={post.id} className="tutor-card">
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
            <div className="location">
              <FaMapMarkerAlt style={{ marginRight: 6 }} /> {post.location}
            </div>
            <h3 className="post-title">{post.title}</h3>
            <p className="post-description">{post.description}</p>
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