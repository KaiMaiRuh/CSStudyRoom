/* QAFeed component */
import React, { useState } from 'react';
import { FaUserCircle, FaCamera, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import './QAFeed.css';
import QAPostDetail from './QAPostDetail';

const QAFeed = ({ posts = [], onDetailOpen, onDetailClose }) => {
  const [selectedPost, setSelectedPost] = useState(null);

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
              <span className="action-icon"><FaThumbsUp /></span>
              <span className="action-icon"><FaComment /></span>
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