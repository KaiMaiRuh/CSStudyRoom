import React from 'react';
import './FeedSelector.css';

/* FeedSelector: switch between tutor and QA feeds */
export default function FeedSelector({ activeFeed, setActiveFeed }) {
  return (
    <div className="feed-selector">
      <button
        className={`selector-button ${activeFeed === 'tutor' ? 'active' : ''}`}
        onClick={() => setActiveFeed('tutor')}
      >
        นัดติว / จับกลุ่ม
      </button>
      <button
        className={`selector-button ${activeFeed === 'qa' ? 'active' : ''}`}
        onClick={() => setActiveFeed('qa')}
      >
        ถาม-ตอบ
      </button>
    </div>
  );
}
