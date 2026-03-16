/* App component */
import { useState } from 'react';
import './App.css';

/* imports */
import FeedSelector from './components/FeedSelector';
import TutorFeed from './components/TutorFeed';
import QAFeed from './components/QAFeed';
import FeedData from './components/FeedData';
import CreateAccount from './components/CreateAccount';
import Profile from './components/Profile';
import CreatePost from './components/CreatePost';
import Navbar from './components/Navbar';
import FloatingMenu from './components/FloatingMenu';

function App() {
  const { tutorPosts, qaPosts, activeFeed, setActiveFeed, addTutorPost, addQaPost } = FeedData();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  const handleShowCreateAccount = () => {
    setShowCreateAccount(true);
  };

  const handleBackToHome = () => {
    setShowCreateAccount(false);
  };

  const handleShowProfile = () => {
    setShowProfile(true);
  };

  const handleShowCreatePost = () => {
    setShowCreatePost(true);
  };

  const handleCloseCreatePost = () => {
    setShowCreatePost(false);
  };

  const handleCreatePost = (type, data) => {
    /* add to feed */
    if (type === 'tutor') {
      addTutorPost({
        author: data.author || 'You',
        subject: data.subject,
        location: data.location,
        title: data.title,
        description: data.description,
        date: data.date,
        time: data.time,
        hours: data.hours,
        capacity: data.capacity,
        current: 1
      });
    } else {
      addQaPost({
        author: data.author || 'You',
        subject: data.subject,
        question: data.question || data.title,
        description: data.description
      });
    }
  };

  const handleBackToHomeFromProfile = () => {
    setShowProfile(false);
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

  if (showProfile) {
    return (
    <div className="app-root">
        <button onClick={handleBackToHomeFromProfile} style={{ marginBottom: '20px' }}>
          Back to Home
      </button>
        <Profile />
      </div>
    );
  }

  return (
    <div>
      <Navbar
        onCreatePost={handleShowCreatePost}
        onCreateAccount={handleShowCreateAccount}
        onViewProfile={handleShowProfile}
        onLogout={() => {}}
        isLoggedIn={false}
      />
      <div className="app-root">
        <h1>CS StudyRoom</h1>

        {/* Feed selector */}
        <FeedSelector activeFeed={activeFeed} setActiveFeed={setActiveFeed} />

        {/* Feed */}
        <div>
          {activeFeed === 'tutor' ? (
            <TutorFeed posts={tutorPosts} />
          ) : (
            <QAFeed posts={qaPosts} />
          )}
        </div>
        {showCreatePost && <CreatePost onCancel={handleCloseCreatePost} onCreate={handleCreatePost} />}
      </div>
      <FloatingMenu onCreatePost={handleShowCreatePost} />
    </div>
  );
}

export default App;

