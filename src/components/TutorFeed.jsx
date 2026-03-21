/* TutorFeed component */
import React, { useMemo, useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt } from 'react-icons/fa';
import './TutorFeed.css';
import TutorPostDetail from './TutorPostDetail';

const TutorFeed = ({ posts = [], onDetailOpen, onDetailClose }) => {
  const [selectedPost, setSelectedPost] = useState(null);

  const fallbackPosts = useMemo(
    () => [
      {
        id: 1,
        user: { name: 'John Doe', avatar: '' },
        subject: 'Algorithm',
        location: 'Engineering Building',
        title: 'Help with Dynamic Programming',
        description: 'Looking for someone to help with DP problems for final exam',
        experience: '',
        date: '2023-05-15',
        time: '14:30',
        minutesAgo: 30,
        capacity: 3,
        current: 2,
        hours: 2
      },
    ],
    []
  );

  const effectivePosts = posts.length ? posts : fallbackPosts;

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
      {effectivePosts.map(post => {
        const joinedCount = post.joinedCount ?? post.current ?? 0;
        return (
        <div key={post.id} className="tutor-card">
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
            <div className="location">
              <FaMapMarkerAlt style={{ marginRight: 6 }} /> {post.location}
            </div>
            <h3 className="post-title">{post.title}</h3>
            <p className="post-description">{post.description}</p>
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