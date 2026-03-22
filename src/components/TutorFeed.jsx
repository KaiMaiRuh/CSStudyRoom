/* TutorFeed component */
import React, { useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt } from 'react-icons/fa';
import './TutorFeed.css';
import TutorPostDetail from './TutorPostDetail';
import ImagePreviewModal from './ImagePreviewModal';

const TutorFeed = ({ posts = [], onDetailOpen, onDetailClose }) => {
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

  if (selectedPost) {
    const detailPost = {
      ...selectedPost,
      joinedCount: selectedPost.joinedCount ?? selectedPost.current,
    };
    return <TutorPostDetail post={detailPost} onBack={handleCloseDetail} />;
  }

  return (
    <div className="tutor-feed">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
      {posts.map(post => {
        const joinedCount = post.joinedCount ?? post.current ?? 0;
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
                <span className="ago">posted {post.minutesAgo} mins ago</span>
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
            {post.imageUrl ? (
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
              เข้าร่วมแล้ว: {joinedCount}/{post.capacity} คน
            </div>
            <button className="read-more-button" type="button" onClick={() => handleOpenDetail(post)}>
              Read more
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
};

export default TutorFeed;