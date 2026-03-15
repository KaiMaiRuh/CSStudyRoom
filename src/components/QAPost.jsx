import React from 'react';

/**
 * A single Q/A post card.
 * Props:
 *  - post: object { id, author, question, answers }
 */
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
      <h3 style={{ margin: '0 0 10px 0' }}>❓ {post.question}</h3>
      <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
        👤 ถามโดย: {post.author}
      </p>
      <div style={{ textAlign: 'right', marginTop: '15px' }}>
        <button>💬 ดูคำตอบ ({post.answers})</button>
      </div>
    </div>
  );
}
