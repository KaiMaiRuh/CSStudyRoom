// src/App.jsx
import { useState } from 'react';
import './App.css';

// component imports
import FeedSelector from './components/FeedSelector';
import TutorFeed from './components/TutorFeed';
import QAFeed from './components/QAFeed';
import FeedData from './components/FeedData';
import CreateAccount from './components/CreateAccount';

function App() {
  const { tutorPosts, qaPosts, activeFeed, setActiveFeed } = FeedData();
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const handleShowCreateAccount = () => {
    setShowCreateAccount(true);
  };

  const handleBackToHome = () => {
    setShowCreateAccount(false);
  };

  if (showCreateAccount) {
    return (
      <div className="app-root">
        <button onClick={handleBackToHome} style={{ marginBottom: '20px' }}>
          Back to Home
        </button>
        <CreateAccount />
      </div>
    );
  }

  return (
    <div className="app-root">
      <h1>CS StudyRoom</h1>
      <button onClick={handleShowCreateAccount} style={{ marginBottom: '20px' }}>
        Create Account
      </button>

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
