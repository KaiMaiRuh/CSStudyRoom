/* App component */
import { useState } from 'react';
import './App.css';

/* imports */
import FeedSelector from './components/FeedSelector';
import { FaSearch } from 'react-icons/fa';
import TutorFeed from './components/TutorFeed';
import QAFeed from './components/QAFeed';
import FeedData from './components/FeedData';
import CreateAccount from './components/CreateAccount';
import SignIn from './components/SignIn';
import Profile from './components/Profile';
import CreatePost from './components/CreatePost';
import Navbar from './components/Navbar';
import FloatingMenu from './components/FloatingMenu';

function App() {
  const { tutorPosts, qaPosts, activeFeed, setActiveFeed, addTutorPost, addQaPost } = FeedData();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isFeedDetailOpen, setIsFeedDetailOpen] = useState(false);

  const isHome = activePage === 'home';
  const isCreateAccountPage = activePage === 'createAccount';
  const isAuthPage = activePage === 'createAccount' || activePage === 'signin';

  const handleShowCreatePost = () => {
    if (isAuthPage) return;
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

  return (
    <div>
      <Navbar
        onLogout={() => {}}
        isLoggedIn={false}
        activePage={activePage}
        disableCreatePost={isAuthPage}
        onNavigate={(page) => {
          // central navigation handler from Navbar
          if (page === 'home') {
            setShowCreateAccount(false);
            setShowProfile(false);
            setActivePage('home');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
          } else if (page === 'profile') {
            setShowProfile(true);
            setShowCreateAccount(false);
            setActivePage('profile');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
          } else if (page === 'createAccount') {
            setShowCreateAccount(true);
            setShowProfile(false);
            setActivePage('createAccount');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
            } else if (page === 'signin') {
              setShowSignIn(true);
              setShowCreateAccount(false);
              setShowProfile(false);
              setActivePage('signin');
              setIsFeedDetailOpen(false);
          } else if (page === 'createPost') {
            if (!isCreateAccountPage) setShowCreatePost(true);
          }
        }}
      />
      <div className="app-root">
        {isHome && !isFeedDetailOpen && <h1>CS StudyRoom</h1>}

        {/* Feed header/controls (Home only; hide when viewing a detail) */}
        {isHome && !isFeedDetailOpen && (
          <>
            <div className="feed-top">
              <FeedSelector activeFeed={activeFeed} setActiveFeed={setActiveFeed} />
            </div>

            <div className="toolbar">
              <form className="search-form" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="text"
                  placeholder="Search posts..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="search-icon"><FaSearch /></span>
              </form>

              <select
                className="category-dropdown"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">หมวดหมู่วิชา</option>
                <option value="computer-science">Computer Science</option>
                <option value="mathematics">Mathematics</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
              </select>
            </div>
          </>
        )}

        {/* Feed (still renders while viewing a detail) */}
        {isHome && (
          <div>
            {activeFeed === 'tutor' ? (
              <TutorFeed
                posts={tutorPosts}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
              />
            ) : (
              <QAFeed
                posts={qaPosts}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
              />
            )}
          </div>
        )}
        {showCreatePost && <CreatePost onCancel={handleCloseCreatePost} onCreate={handleCreatePost} />}
      {showCreateAccount && <CreateAccount onNavigate={(p)=> {
        if (p === 'signin') {
          setShowCreateAccount(false);
          setShowSignIn(true);
          setActivePage('signin');
        }
      }} />}
      {showSignIn && <SignIn onNavigate={(p)=>{
        if (p === 'createAccount') {
          setShowSignIn(false);
          setShowCreateAccount(true);
          setActivePage('createAccount');
        }
      }} />}
      {showProfile && <Profile />}
      </div>
      {!isAuthPage && !showCreatePost && <FloatingMenu onCreatePost={handleShowCreatePost} />}
    </div>
  );
}

export default App;

