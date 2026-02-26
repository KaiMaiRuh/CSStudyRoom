import React from 'react';

/**
 * Selector that lets the user switch between the two feeds.
 * Props:
 *  - activeFeed: string ('tutor' or 'qa')
 *  - setActiveFeed: function to change the feed
 */
export default function FeedSelector({ activeFeed, setActiveFeed }) {
  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      <button
        onClick={() => setActiveFeed('tutor')}
        style={{ fontWeight: activeFeed === 'tutor' ? 'bold' : 'normal', flex: 1 }}
      >
        นัดติว / จับกลุ่ม
      </button>
      <button
        onClick={() => setActiveFeed('qa')}
        style={{ fontWeight: activeFeed === 'qa' ? 'bold' : 'normal', flex: 1 }}
      >
        ถาม-ตอบ
      </button>
    </div>
  );
}
