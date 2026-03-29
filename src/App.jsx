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
import GroupMessagePage from './components/GroupMessagePage';
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
  const isGroupMessagePage = activePage === 'groupmessage';

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

  // --- URL <-> page helper: keep existing state-based navigation but sync browser URL
  const pageToPath = (page) => {
    switch (page) {
      case 'home': return '/';
      case 'profile': return '/profile';
      case 'editProfile': return '/profile/edit';
      case 'createAccount': return '/create-account';
      case 'signin': return '/signin';
      case 'createPost': return '/create-post';
      case 'admin': return '/admin';
      case 'groupmessage': return '/groupmessage';
      default: return '/';
    }
  };

  const pathToPage = (pathname) => {
    const p = (pathname || '').replace(/\/+$/, '') || '/';
    if (p === '/' || p === '' || p === '/home') return 'home';
    if (p.startsWith('/profile/edit')) return 'editProfile';
    if (p.startsWith('/profile')) return 'profile';
    if (p.startsWith('/create-account')) return 'createAccount';
    if (p.startsWith('/signin')) return 'signin';
    if (p.startsWith('/create-post')) return 'createPost';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/groupmessage')) return 'groupmessage';
    return 'home';
  };

  const applyPageState = (page) => {
    // reset modal/page-specific flags first
    setShowCreateAccount(false);
    setShowProfile(false);
    setShowEditProfile(false);
    setShowSignIn(false);
    setShowCreatePost(false);
    setIsFeedDetailOpen(false);

    // Prevent unauthenticated access to certain pages
    if (!user && (page === 'home' || page === 'profile' || page === 'admin')) {
      setShowSignIn(true);
      setActivePage('signin');
      return;
    }

    // Admin access restrictions
    if (isAdmin && (page === 'profile' || page === 'createPost')) {
      // keep current page, show alert
      alert('Admin does not have Profile/Create Post pages');
      return;
    }

    switch (page) {
      case 'home':
        setActivePage('home');
        break;
      case 'profile':
        setShowProfile(true);
        setActivePage('profile');
        break;
      case 'editProfile':
        setShowEditProfile(true);
        setActivePage('profile');
        break;
      case 'createAccount':
        setShowCreateAccount(true);
        setActivePage('createAccount');
        break;
      case 'signin':
        setShowSignIn(true);
        setActivePage('signin');
        break;
      case 'createPost':
        setShowCreatePost(true);
        setActivePage('createPost');
        break;
      case 'admin':
        if (!isAdmin) {
          alert('You are not authorized to access Admin');
          setActivePage('home');
        } else {
          setActivePage('admin');
        }
        break;
      case 'groupmessage':
        if (!user) {
          setShowSignIn(true);
          setActivePage('signin');
        } else {
          setActivePage('groupmessage');
        }
        break;
      default:
        setActivePage('home');
    }
  };

  const navigateTo = (page, { push = true, replace = false } = {}) => {
    applyPageState(page);
    if (push) {
      try {
        const url = pageToPath(page);
        if (replace) {
          window.history.replaceState({ page }, '', url);
        } else {
          window.history.pushState({ page }, '', url);
        }
      } catch (err) {
        console.warn('History API not available', err);
      }
    }
  };

  useEffect(() => {
    const handlePop = () => {
      const p = pathToPage(window.location.pathname);
      applyPageState(p);
    };
    window.addEventListener('popstate', handlePop);

    // initial sync from URL
    const initial = pathToPage(window.location.pathname);
    applyPageState(initial);
    window.history.replaceState({ page: initial }, '', window.location.pathname);

    return () => window.removeEventListener('popstate', handlePop);
  }, [user, isAdmin]);



  const handleShowCreatePost = () => {
    if (isAuthPage) return;
    if (isAdmin) return;
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
            navigateTo('home');
          });
        }}
        isLoggedIn={Boolean(user)}
        activePage={activePage}
        disableCreatePost={isAuthPage || isAdminPage || isAdmin}
        showCreatePost={!isAdminPage && !isAdmin}
        onNavigate={navigateTo}
      />
      <div className="app-root">
        {isGroupMessagePage ? (
          <GroupMessagePage onBack={() => {
            navigateTo('home');
          }} />
        ) : isAdminPage ? (
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
                canDelete={isAdmin}
                onDeletePost={(post) => handleDeletePost({ type: 'tutor', id: post?.id })}
              />
            ) : (
              <QAFeed
                posts={filteredQaPosts}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
                canDelete={isAdmin}
                onDeletePost={(post) => handleDeletePost({ type: 'qa', id: post?.id })}
              />
            )}
          </div>
        )}
        {showCreateAccount && <CreateAccount onNavigate={navigateTo} />}
      {showSignIn && <SignIn onNavigate={navigateTo} />}
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
      {!isAuthPage && !showCreatePost && !isAdminPage && (
        <FloatingMenu
          onCreatePost={handleShowCreatePost}
          hideCreatePost={isAdmin}
          hideNotification={isAdmin}
          hideGroupMessage={isAdmin}
          isGroupMessagePage={isGroupMessagePage}
          onNavigate={navigateTo}
        />
      )}
    </div>
  );
}

export default App;

