import React from 'react';
import QAPost from './QAPost';

/**
 * Displays a list of Q/A posts.
 * Props:
 *  - posts: array of qa post objects
 */
export default function QAFeed({ posts }) {
  return (
    <div>
      <h2>กระทู้ถาม-ตอบล่าสุด</h2>
      {posts.map(p => (
        <QAPost key={p.id} post={p} />
      ))}
    </div>
  );
}
