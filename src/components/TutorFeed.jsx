import React from 'react';
import TutorPost from './TutorPost';

/**
 * Displays a list of tutor posts.
 * Props:
 *  - posts: array of tutor post objects
 */
export default function TutorFeed({ posts }) {
  return (
    <div>
      <h2>กิจกรรมที่กำลังเปิดรับ</h2>
      {posts.map(p => (
        <TutorPost key={p.id} post={p} />
      ))}
    </div>
  );
}
