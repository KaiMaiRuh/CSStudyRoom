/* TutorFeed component */
import React, { useState } from 'react';
import { FaUserCircle, FaMapMarkerAlt } from 'react-icons/fa';
import './TutorFeed.css';

const TutorFeed = () => {
  const [posts] = useState([
    {
      id: 1,
      user: { name: 'John Doe', avatar: '' },
      subject: 'Algorithm',
      location: 'My Room 😏',
      title: 'ช่วยอยู่กินข้าวเป็นเพื่อนตอนผมอ่าน Algo หน่อยครับ',
      description: 'ผมอ่านวิชานี้แล้วกินข้าวไม่อร่อย',
      date: '2023-05-15',
      time: '14:30',
      minutesAgo: 'โคตรหลาย',
      capacity: 3,
      current: 2,
      hours: 2
    },
    {
      id: 2,
      user: { name: 'Jane Smith', avatar: '' },
      subject: 'Software Engineering',
      location: 'Discord',
      title: 'มาช่วยกุทำหน่อยไอพวกเห',
      description: 'Need help อ้ากกๆๆๆๆๆ',
      date: '2023-05-14',
      time: '10:00',
      minutesAgo: 'โคตรของโคตรจะหลาย',
      capacity: 5,
      current: 5,
      hours: 1.5
    }
  ]);

  return (
    <div className="tutor-feed">
      {posts.map(post => (
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
              เข้าร่วมแล้ว: {post.current}/{post.capacity} คน
            </div>
            <button className="read-more-button">Read more</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TutorFeed;