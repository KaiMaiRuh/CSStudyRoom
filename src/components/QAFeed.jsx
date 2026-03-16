/* QAFeed component */
import React, { useState } from 'react';
import { FaUserCircle, FaCamera, FaThumbsUp, FaComment, FaShare } from 'react-icons/fa';
import './QAFeed.css';

const QAFeed = () => {
  const [posts] = useState([
    {
      id: 1,
      user: { name: 'Alex Johnson', avatar: '' },
      subject: 'Algorithm',
      question: 'ทำไมเรียนวิชานี้แล้วกินข้าวไม่อร่อย',
      date: '2023-05-15',
      time: '15:45',
      minutesAgo: 'หลาย',
      likes: 12,
      comments: 3,
      shares: 1
    },
    {
      id: 2,
      user: { name: 'Maria Garcia', avatar: '' },
      subject: 'Mathematics',
      question: '1+1 เท่ากับเท่าไหร่ครับ',
      date: '2023-05-14',
      time: '09:20',
      minutesAgo: 'หลาย',
      likes: 8,
      comments: 2,
      shares: 0
    }
  ]);

  return (
    <div className="qa-feed">
      {posts.map(post => (
        <div key={post.id} className="qa-card">
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
            <div className="action-bar">
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