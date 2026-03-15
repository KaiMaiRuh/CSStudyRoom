// src/App.jsx
import { useState } from 'react';
import './App.css';

// component imports
import FeedSelector from './components/FeedSelector';
import TutorFeed from './components/TutorFeed';
import QAFeed from './components/QAFeed';
import FeedData from './components/FeedData';

function App() {
  const { tutorPosts, qaPosts, activeFeed, setActiveFeed } = FeedData();

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>CS StudyRoom</h1>

      {/* selector for feed tabs */}
      <FeedSelector activeFeed={activeFeed} setActiveFeed={setActiveFeed} />

      {/* render the chosen feed */}
      <div>
        {activeFeed === 'tutor' ? (
          <TutorFeed posts={tutorPosts} />
        ) : (
          <QAFeed posts={qaPosts} />
        )}
      </div>
    </div>
  )
}

export default App;