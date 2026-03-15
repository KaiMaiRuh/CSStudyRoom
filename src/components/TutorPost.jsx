import React from 'react';

/**
 * A single tutor post card.
 * Props:
 *  - post: object { id, author, topic, detail, joined, maxSlots }
 */
export default function TutorPost({ post }) {
  return (
    <div
      className="post-card"
      key={post.id}
      style={{
        border: '1px solid #ccc',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '15px',
        textAlign: 'left',
      }}
    >
      <h3 style={{ margin: '0 0 10px 0' }}>{post.topic}</h3>
      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
        👤 โพสต์โดย: {post.author}
      </p>
      <p>{post.detail}</p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '15px',
        }}
      >
        <span>
          เข้าร่วมแล้ว: {post.joined}/{post.maxSlots} คน
        </span>
        <button style={{ backgroundColor: '#4CAF50', color: 'white' }}>
          ➕ Join กิจกรรม
        </button>
      </div>
    </div>
  );
}
