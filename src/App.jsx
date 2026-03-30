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
import Footer from './components/Footer';
import AdminPanel from './components/admin/AdminPanel';
import GroupMessagePage from './components/GroupMessagePage';
import Calendar from './components/Calendar';
import { useAuth } from './auth/AuthContext.jsx';

function App() {
  const { user, loading: authLoading, profileLoading, signOut, logActivity, isAdmin } = useAuth();
  const {
    tutorPosts,
    qaPosts,
    allSubjects,
    activeFeed,
    setActiveFeed,
    hasMoreTutorPosts,
    hasMoreQaPosts,
    isLoadingMoreTutorPosts,
    isLoadingMoreQaPosts,
    loadMoreTutorPosts,
    loadMoreQaPosts,
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
  const [initialRouteApplied, setInitialRouteApplied] = useState(false);
  const [openPostRef, setOpenPostRef] = useState(null);
  const [viewProfileUid, setViewProfileUid] = useState(null);

  const isHome = activePage === 'home';
  const isAuthPage = activePage === 'createAccount' || activePage === 'signin';
  const isAdminPage = activePage === 'admin';
  const isGroupMessagePage = activePage === 'groupmessage';
  const isCalendarPage = activePage === 'calendar';
  const showFooter = !showCreatePost;

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
  // Use hash-based URLs to avoid server 404 on refresh (works on GitHub Pages)
  const pageToPath = (page) => {
    switch (page) {
      case 'home': return '#/';
      case 'tutor': return '#/tutor';
      case 'qa': return '#/qa';
      case 'profile': return '#/profile';
      case 'editProfile': return '#/profile/edit';
      case 'createAccount': return '#/create-account';
      case 'signin': return '#/signin';
      case 'createPost': return '#/create-post';
      case 'admin': return '#/admin';
      case 'calendar': return '#/calendar';
      case 'groupmessage': return '#/groupmessage';
      default: return '#/';
    }
  };

  const pathToPage = (raw) => {
    // prefer hash if present, otherwise pathname
    const src = (window.location.hash && window.location.hash.replace(/^#/, '')) || raw || window.location.pathname || '/';
    const p = (src || '').replace(/\/+$/, '') || '/';
    if (p === '/' || p === '' || p === '/home') return 'home';
    if (p === '/tutor') return 'home';
    if (p === '/qa') return 'home';
    if (p.startsWith('/profile/edit')) return 'editProfile';
    if (p.startsWith('/profile')) return 'profile';
    if (p.startsWith('/create-account')) return 'createAccount';
    if (p.startsWith('/signin')) return 'signin';
    if (p.startsWith('/create-post')) return 'createPost';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/calendar')) return 'calendar';
    if (p.startsWith('/groupmessage')) return 'groupmessage';
    return 'home';
  };

  const extractFeedFromRaw = (raw) => {
    const src = (window.location.hash && window.location.hash.replace(/^#/, '')) || raw || window.location.pathname || '/';
    const p = (src || '').replace(/\/+$/, '') || '/';
    if (p === '/tutor' || p.startsWith('/tutor/')) return 'tutor';
    if (p === '/qa' || p.startsWith('/qa/')) return 'qa';
    return null;
  };

  const extractPostRefFromRaw = (raw) => {
    const src = (window.location.hash && window.location.hash.replace(/^#/, '')) || raw || window.location.pathname || '/';
    const p = (src || '').replace(/\/+$/, '') || '/';

    const tutorMatch = p.match(/^\/tutor\/([^/]+)$/);
    if (tutorMatch) return { type: 'tutor', id: tutorMatch[1] };

    const qaMatch = p.match(/^\/qa\/([^/]+)$/);
    if (qaMatch) return { type: 'qa', id: qaMatch[1] };

    return null;
  };

  const extractProfileUidFromRaw = (raw) => {
    const src = (window.location.hash && window.location.hash.replace(/^#/, '')) || raw || window.location.pathname || '/';
    const p = (src || '').replace(/\/+$/, '') || '/';

    // /profile/{uid}
    const m = p.match(/^\/profile\/([^/]+)$/);
    if (m && m[1] && m[1] !== 'edit') return m[1];
    return null;
  };

  const applyPageState = (page) => {
    // Treat CreatePost as an overlay: do not wipe the underlying page state.
    if (page === 'createPost') {
      setShowCreatePost(true);
      return;
    }

    // reset modal/page-specific flags first
    setShowCreateAccount(false);
    setShowProfile(false);
    setShowEditProfile(false);
    setShowSignIn(false);
    setShowCreatePost(false);
    setIsFeedDetailOpen(false);

    // Prevent unauthenticated access to certain pages
    if (!user && (page === 'home' || page === 'profile' || page === 'admin')) {
      // If auth is still initializing, postpone the redirect to avoid a flash
      if (authLoading) {
        return;
      }
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
        // Keep CreatePost as an overlay so the feed remains visible underneath
        setShowCreatePost(true);
        break;
      case 'admin':
        // Wait until auth + profile are ready before deciding admin permission.
        // This prevents a brief unauthorized flash on refresh.
        if (authLoading || profileLoading) {
          setActivePage('admin');
          break;
        }

        if (!isAdmin) {
          alert('You are not authorized to access Admin');
          setActivePage('home');
        } else {
          setActivePage('admin');
        }
        break;
      case 'groupmessage':
        if (!user) {
          if (authLoading) return;
          setShowSignIn(true);
          setActivePage('signin');
        } else {
          setActivePage('groupmessage');
        }
        break;
      case 'calendar':
        if (!user) {
          if (authLoading) return;
          setShowSignIn(true);
          setActivePage('signin');
        } else if (!isAdmin) {
          setActivePage('calendar');
        } else {
          alert('Admin does not have Calendar page');
          setActivePage('home');
        }
        break;
      default:
        setActivePage('home');
    }
  };

  // Apply route immediately without performing auth redirects.
  // Used on initial load or when hash changes while auth is still initializing.
  const applyInitialRoute = (page) => {
    // Treat CreatePost as an overlay: do not wipe the underlying page state.
    if (page === 'createPost') {
      setShowCreatePost(true);
      return;
    }

    // reset modal/page-specific flags first
    setShowCreateAccount(false);
    setShowProfile(false);
    setShowEditProfile(false);
    setShowSignIn(false);
    setShowCreatePost(false);
    setIsFeedDetailOpen(false);

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
        // overlay only; keep feed visible
        setShowCreatePost(true);
        break;
      case 'admin':
        setActivePage('admin');
        break;
      case 'calendar':
        setActivePage('calendar');
        break;
      case 'groupmessage':
        setActivePage('groupmessage');
        break;
      default:
        setActivePage('home');
    }
  };

  const navigateTo = (page, { push = true, replace = false } = {}) => {
    applyPageState(page);
    if (push) {
      try {
        const hash = pageToPath(page); // e.g. '#/profile'
        if (replace) {
          window.history.replaceState({ page }, '', hash);
        } else {
          // set hash (creates history entry)
          window.location.hash = hash.replace(/^#/, '');
        }
      } catch (err) {
        console.warn('Navigation failed', err);
      }
    }
  };

  const setActiveFeedAndNavigate = (feed) => {
    if (!feed) return;
    setActiveFeed(feed);
    try {
      window.location.hash = (feed === 'tutor') ? '/tutor' : '/qa';
    } catch {
      // ignore
    }
  };

  // After successful login, take user to Home/Feed
  // (but do NOT override the current page on refresh)
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const raw = window.location.hash || window.location.pathname;
    const pageFromUrl = pathToPage(raw);
    const onSignInPage = activePage === 'signin' || showSignIn || pageFromUrl === 'signin';
    if (onSignInPage) {
      navigateTo('home', { replace: true });
    }
  }, [user, authLoading, activePage, showSignIn]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleHash = () => {
      const raw = window.location.hash || window.location.pathname;
      const p = pathToPage(raw);
      const feed = extractFeedFromRaw(raw);
      if (feed) setActiveFeed(feed);

      if (p === 'profile') {
        setViewProfileUid(extractProfileUidFromRaw(raw));
      } else {
        setViewProfileUid(null);
      }

      // Support deep links to post detail via hash routes:
      // - #/qa/{postId}
      // - #/tutor/{postId}
      if (p === 'home') {
        setOpenPostRef(extractPostRefFromRaw(raw));
      } else {
        setOpenPostRef(null);
      }

      if (authLoading) {
        applyInitialRoute(p);
      } else {
        applyPageState(p);
      }
    };
    window.addEventListener('hashchange', handleHash);

    // initial sync from URL (use hash when available)
    const raw = window.location.hash || window.location.pathname;
    const initial = pathToPage(raw);
    const initialFeed = extractFeedFromRaw(raw);
    if (initialFeed) setActiveFeed(initialFeed);

    if (initial === 'profile') {
      setViewProfileUid(extractProfileUidFromRaw(raw));
    } else {
      setViewProfileUid(null);
    }

    if (initial === 'home') {
      setOpenPostRef(extractPostRefFromRaw(raw));
    } else {
      setOpenPostRef(null);
    }

    if (!initialRouteApplied) {
      applyInitialRoute(initial);
      setInitialRouteApplied(true);
    }

    // Once auth is ready, enforce auth-based redirects
    if (!authLoading) {
      applyPageState(initial);
      // ensure URL has a hash so refresh keeps the route
      try {
        const currentHash = window.location.hash || '#/';
        window.history.replaceState({ page: initial }, '', currentHash);
      } catch {
        // ignore
      }
    }

    return () => window.removeEventListener('hashchange', handleHash);
  }, [user, isAdmin, authLoading, profileLoading, initialRouteApplied]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setIsFeedDetailOpen(Boolean(openPostRef?.id));
  }, [openPostRef?.id]);



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
    <div className="app-shell">
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
        ) : isCalendarPage ? (
          <Calendar tutorPosts={tutorPosts} onBack={() => navigateTo('home')} />
        ) : isAdminPage ? (
          <AdminPanel />
        ) : (
          <>
            {isHome && !isFeedDetailOpen && <h1>CS StudyRoom</h1>}

        {/* Feed header/controls (Home only; hide when viewing a detail) */}
        {isHome && !isFeedDetailOpen && (
          <>
            <div className="feed-top">
              <FeedSelector activeFeed={activeFeed} setActiveFeed={setActiveFeedAndNavigate} />
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
                openPostId={openPostRef?.type === 'tutor' ? openPostRef.id : null}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
                hasMore={hasMoreTutorPosts}
                isLoadingMore={isLoadingMoreTutorPosts}
                onLoadMore={loadMoreTutorPosts}
                canDelete={isAdmin}
                onDeletePost={(post) => handleDeletePost({ type: 'tutor', id: post?.id })}
              />
            ) : (
              <QAFeed
                posts={filteredQaPosts}
                openPostId={openPostRef?.type === 'qa' ? openPostRef.id : null}
                onDetailOpen={() => setIsFeedDetailOpen(true)}
                onDetailClose={() => setIsFeedDetailOpen(false)}
                hasMore={hasMoreQaPosts}
                isLoadingMore={isLoadingMoreQaPosts}
                onLoadMore={loadMoreQaPosts}
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
          viewUid={viewProfileUid}
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
      {showFooter && <Footer />}
    </div>
  );
}

export default App;

