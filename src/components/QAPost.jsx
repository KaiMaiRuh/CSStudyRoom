import React from 'react';
import { FaQuestionCircle, FaUserCircle, FaComment } from 'react-icons/fa';

/* QAPost: single Q/A post card */
export default function QAPost({ post }) {
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
      <h3 style={{ margin: '0 0 10px 0' }}><FaQuestionCircle style={{ marginRight: 8 }} />{post.question}</h3>
      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <FaUserCircle />
        <span>ถามโดย: {post.author}</span>
      </p>
      <div style={{ textAlign: 'right', marginTop: '15px' }}>
        <button style={{ display: 'flex', gap: '8px', alignItems: 'center' }}><FaComment /> ดูคำตอบ ({post.answers})</button>
      </div>
    </div>
  );
}
