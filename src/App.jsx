/* App component */
import { useEffect, useState } from 'react';
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
import EditProfile from './components/EditProfile';
import CreatePost from './components/CreatePost';
import Navbar from './components/Navbar';
import FloatingMenu from './components/FloatingMenu';
import AdminPanel from './components/admin/AdminPanel';
import { useAuth } from './auth/AuthContext.jsx';

function App() {
  const { user, loading: authLoading, signOut, logActivity, isAdmin } = useAuth();
  const {
    tutorPosts,
    qaPosts,
    allSubjects,
    activeFeed,
    setActiveFeed,
    addTutorPost,
    addQaPost,
    updateTutorPost,
    updateQaPost,
    deleteTutorPost,
    deleteQaPost,
  } = FeedData();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isFeedDetailOpen, setIsFeedDetailOpen] = useState(false);

  const isHome = activePage === 'home';
  const isCreateAccountPage = activePage === 'createAccount';
  const isAuthPage = activePage === 'createAccount' || activePage === 'signin';
  const isAdminPage = activePage === 'admin';

  // Filter posts based on search and category
  const filteredTutorPosts = tutorPosts.filter(post => {
    const matchesCategory = !category || post.subject === category;
    const searchLower = searchQuery.toLowerCase().normalize('NFC');
    const matchesSearch = 
      !searchQuery || 
      post.title.toLowerCase().normalize('NFC').includes(searchLower) || 
      post.description.toLowerCase().normalize('NFC').includes(searchLower) ||
      post.subject.toLowerCase().normalize('NFC').includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const filteredQaPosts = qaPosts.filter(post => {
    const matchesCategory = !category || post.subject === category;
    const searchLower = searchQuery.toLowerCase().normalize('NFC');
    const matchesSearch = 
      !searchQuery || 
      post.question.toLowerCase().normalize('NFC').includes(searchLower) ||
      post.subject.toLowerCase().normalize('NFC').includes(searchLower);
    return matchesCategory && matchesSearch;
  });



  const handleShowCreatePost = () => {
    if (isAuthPage) return;
    setShowCreatePost(true);
    setEditingPost(null);
  };

  const handleCloseCreatePost = () => {
    setShowCreatePost(false);
    setEditingPost(null);
  };

  const handleCreatePost = (type, data) => {
    const promise = (async () => {
      /* add to feed */
      if (type === 'tutor') {
        await addTutorPost({
          subject: data.subject,
          location: data.location,
          title: data.title,
          description: data.description,
          date: data.date,
          time: data.time,
          hours: data.hours,
          capacity: data.capacity,
          current: 1,
          images: data.images || [],
        });
      } else {
        await addQaPost({
          subject: data.subject,
          question: data.question || data.title,
          description: data.description,
          images: data.images || [],
        });
      }
    })();

    promise.catch((err) => {
      alert(err?.message || 'Failed to create post');
    });
  };

  const handleUpdatePost = (type, data, postId) => {
    const promise = (async () => {
      if (!postId) throw new Error('Missing post id');
      if (type === 'tutor') {
        await updateTutorPost(postId, data);
      } else {
        await updateQaPost(postId, data);
      }
    })();

    promise.catch((err) => {
      alert(err?.message || 'Failed to update post');
    });
  };

  const handleDeletePost = ({ type, id }) => {
    const ok = window.confirm('Delete this post?');
    if (!ok) return;

    const promise = (async () => {
      if (!id) throw new Error('Missing post id');
      if (type === 'tutor') {
        await deleteTutorPost(id);
      } else {
        await deleteQaPost(id);
      }
    })();

    promise.catch((err) => {
      alert(err?.message || 'Failed to delete post');
    });
  };

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) return;

    // If user is not signed in, prevent access to Home and Profile
    if (!user) {
      if (activePage === 'home' || activePage === 'profile' || showProfile) {
        setShowSignIn(true);
        setShowCreateAccount(false);
        setShowProfile(false);
        setShowEditProfile(false);
        setShowCreatePost(false);
        setActivePage('signin');
        setIsFeedDetailOpen(false);
      }
    }
  }, [user, authLoading, activePage, showProfile]);

  useEffect(() => {
    // Log page visits / navigation for authenticated users
    if (!user) return;
    // fire-and-forget
    try {
      logActivity?.('page_view', { page: activePage, path: window.location.pathname });
    } catch (err) {
      console.error('Failed To Log Page View', err);
    }
  }, [user, activePage, logActivity]);

  return (
    <div>
      <Navbar
        onLogout={() => {
          const p = Promise.resolve(signOut());
          p.finally(() => {
            setShowCreateAccount(false);
            setShowProfile(false);
            setShowEditProfile(false);
            setShowSignIn(false);
            setActivePage('home');
            setIsFeedDetailOpen(false);
          });
        }}
        isLoggedIn={Boolean(user)}
        activePage={activePage}
        disableCreatePost={isAuthPage || isAdminPage}
        showCreatePost={!isAdminPage}
          onNavigate={(page) => {
            // Prevent unauthenticated navigation to Home/Profile
            if (!user && (page === 'home' || page === 'profile' || page === 'admin')) {
              setShowSignIn(true);
              setShowCreateAccount(false);
              setShowProfile(false);
              setShowEditProfile(false);
              setActivePage('signin');
              setIsFeedDetailOpen(false);
              return;
            }
          // central navigation handler from Navbar
          if (page === 'home') {
            setShowCreateAccount(false);
            setShowProfile(false);
            setShowEditProfile(false);
            setActivePage('home');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
              setShowCreatePost(false);
          } else if (page === 'profile') {
            setShowProfile(true);
            setShowEditProfile(false);
            setShowCreateAccount(false);
            setActivePage('profile');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
              setShowCreatePost(false);
          } else if (page === 'createAccount') {
            setShowCreateAccount(true);
            setShowProfile(false);
            setShowEditProfile(false);
            setActivePage('createAccount');
            setIsFeedDetailOpen(false);
              setShowSignIn(false);
              setShowCreatePost(false);
            } else if (page === 'signin') {
              setShowSignIn(true);
              setShowCreateAccount(false);
              setShowProfile(false);
              setShowEditProfile(false);
              setActivePage('signin');
              setIsFeedDetailOpen(false);
              setShowCreatePost(false);
          } else if (page === 'createPost') {
            if (!isCreateAccountPage) setShowCreatePost(true);
          } else if (page === 'admin') {
            if (!isAdmin) {
              alert('You are not authorized to access Admin');
              return;
            }
            setShowCreateAccount(false);
            setShowProfile(false);
            setShowEditProfile(false);
            setShowSignIn(false);
            setShowCreatePost(false);
            setActivePage('admin');
            setIsFeedDetailOpen(false);
          }
        }}
      />
      <div className="app-root">
        {isAdminPage ? (
          <AdminPanel />
        ) : (
          <>
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
                {allSubjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Feed (still renders while viewing a detail) */}
        {isHome && (
          <div>
            {activeFeed === 'tutor' ? (
              <TutorFeed
                posts={filteredTutorPosts}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
              />
            ) : (
              <QAFeed
                posts={filteredQaPosts}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
              />
            )}
          </div>
        )}
        {showCreatePost && (
          editingPost ? (
            <CreatePost
              key={`edit-${editingPost.type}-${editingPost.id}`}
              mode="edit"
              initialPost={editingPost}
              allSubjects={allSubjects}
              onCancel={handleCloseCreatePost}
              onUpdate={handleUpdatePost}
            />
          ) : (
            <CreatePost key="create" allSubjects={allSubjects} onCancel={handleCloseCreatePost} onCreate={handleCreatePost} />
          )
        )}
        {showCreateAccount && <CreateAccount onNavigate={(p)=> {
        if (p === 'signin') {
          setShowCreateAccount(false);
          setShowSignIn(true);
          setActivePage('signin');
          } else if (p === 'editProfile') {
            setShowCreateAccount(false);
            setShowSignIn(false);
            setShowProfile(false);
            setShowEditProfile(true);
            setActivePage('profile');
        }
      }} />}
      {showSignIn && <SignIn onNavigate={(p)=>{
        if (p === 'createAccount') {
          setShowSignIn(false);
          setShowCreateAccount(true);
          setActivePage('createAccount');
        } else if (p === 'home') {
          setShowSignIn(false);
          setShowCreateAccount(false);
          setShowProfile(false);
          setActivePage('home');
          setIsFeedDetailOpen(false);
        }
      }} />}
      {showProfile && (
        <Profile
          tutorPosts={tutorPosts}
          qaPosts={qaPosts}
          onEdit={() => {
            setShowEditProfile(true);
            setShowProfile(false);
            setActivePage('profile');
          }}
          onEditPost={({ type, id, post }) => {
            const base = post || {};
            if (type === 'tutor') {
              setEditingPost({
                type: 'tutor',
                id,
                subject: base.subject || '',
                location: base.location || '',
                title: base.title || '',
                description: base.description || '',
                date: base.date || '',
                time: base.time || '',
                hours: base.hours ?? '',
                capacity: base.capacity ?? '',
                images: Array.isArray(base.images) ? base.images : (base.imageUrl ? [base.imageUrl] : []),
              });
            } else {
              setEditingPost({
                type: 'qa',
                id,
                subject: base.subject || '',
                question: base.question || '',
                description: base.description || '',
                images: Array.isArray(base.images) ? base.images : (base.imageUrl ? [base.imageUrl] : []),
              });
            }
            setShowCreatePost(true);
          }}
          onDeletePost={handleDeletePost}
        />
      )}

      {showEditProfile && (
        <EditProfile
          onCancel={() => {
            setShowEditProfile(false);
            setShowProfile(true);
            setActivePage('profile');
          }}
          onDone={() => {
            setShowEditProfile(false);
            setShowProfile(true);
            setActivePage('profile');
          }}
        />
      )}
          </>
        )}
      </div>
      {!isAuthPage && !showCreatePost && !isAdminPage && <FloatingMenu onCreatePost={handleShowCreatePost} />}
    </div>
  );
}

export default App;

