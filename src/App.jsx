/* App component */
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import './App.css';

/* imports */
import FeedSelector from './components/common/FeedSelector';
import { FaSearch } from 'react-icons/fa';
import TutorFeed from './features/tutor-feed/TutorFeed';
import QAFeed from './features/qa-feed/QAFeed';
import useFeedData from './hooks/useFeedData';
import CreateAccount from './features/auth/CreateAccount';
import SignIn from './features/auth/SignIn';
import Profile from './features/profile/Profile';
import EditProfile from './features/profile/EditProfile';
import CreatePost from './features/auth/CreatePost';
import Navbar from './components/layout/Navbar';
import FloatingMenu from './components/layout/FloatingMenu';
import Footer from './components/layout/Footer';
import AdminPanel from './features/admin/AdminPanel';
import GroupMessagePage from './features/chat/GroupMessagePage';
import Calendar from './features/calendar/Calendar';
import ResetPassword from './features/auth/ResetPassword';
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
  } = useFeedData();
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [activePage, setActivePage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isFeedDetailOpen, setIsFeedDetailOpen] = useState(() => {
    const hash = (window.location.hash || '').replace(/^#/, '');
    return /^\/(qa|tutor)\/[^/]+$/.test(hash.split('?')[0]);
  });
  const [initialRouteApplied, setInitialRouteApplied] = useState(false);
  const [openPostRef, setOpenPostRef] = useState(() => {
    const hash = (window.location.hash || '').replace(/^#/, '');
    const pathOnly = (hash.split('?')[0] || '/').replace(/\/+$/, '') || '/';
    const tutorM = pathOnly.match(/^\/tutor\/([^/]+)$/);
    if (tutorM) return { type: 'tutor', id: tutorM[1], backHash: null };
    const qaM = pathOnly.match(/^\/qa\/([^/]+)$/);
    if (qaM) return { type: 'qa', id: qaM[1], backHash: null };
    return null;
  });
  const [viewProfileUid, setViewProfileUid] = useState(null);
  const [displayFeed, setDisplayFeed] = useState(() => (activeFeed === 'qa' ? 'qa' : 'tutor'));
  const [feedTransitionPhase, setFeedTransitionPhase] = useState('idle');
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);
  const hasFilterInitializedRef = useRef(false);
  const categoryMenuRef = useRef(null);

  const isHome = activePage === 'home';
  const isAuthPage = activePage === 'createAccount' || activePage === 'signin';
  const isAdminPage = activePage === 'admin';
  const isGroupMessagePage = activePage === 'groupmessage';
  const isCalendarPage = activePage === 'calendar';
  const isResetPasswordPage = activePage === 'resetPassword';
  const showFooter = !showCreatePost;
  const categoryDisplayLabel = category || 'Subject Category';

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
  const getRawPathSource = (raw) =>
    (window.location.hash && window.location.hash.replace(/^#/, '')) || raw || window.location.pathname || '/';

  const getNormalizedPath = (raw) => {
    const src = getRawPathSource(raw);
    const [pathOnly = '/'] = String(src).split('?');
    return pathOnly.replace(/\/+$/, '') || '/';
  };

  const getActionParams = (raw) => {
    const params = new URLSearchParams(window.location.search || '');
    const src = getRawPathSource(raw);
    const [, query = ''] = String(src).split('?');

    if (query) {
      const hashParams = new URLSearchParams(query);
      hashParams.forEach((value, key) => {
        params.set(key, value);
      });
    }

    return params;
  };

  const buildCalendarHash = ({ selectedDateKey = null, feed = null } = {}) => {
    const params = new URLSearchParams();

    if (selectedDateKey) params.set('date', selectedDateKey);
    if (feed === 'qa' || feed === 'tutor') params.set('feed', feed);

    const query = params.toString();
    return `#/calendar${query ? `?${query}` : ''}`;
  };

  const pageToPath = (page) => {
    switch (page) {
      case 'home': return '#/';
      case 'tutor': return '#/tutor';
      case 'qa': return '#/qa';
      case 'profile': return '#/profile';
      case 'editProfile': return '#/profile/edit';
      case 'createAccount': return '#/create-account';
      case 'signin': return '#/signin';
      case 'resetPassword': return '#/reset-password';
      case 'createPost': return '#/create-post';
      case 'admin': return '#/admin';
      case 'calendar': return '#/calendar';
      case 'groupmessage': return '#/groupmessage';
      default: return '#/';
    }
  };

  const pathToPage = (raw) => {
    const params = getActionParams(raw);
    if (params.get('mode') === 'resetPassword') {
      return 'resetPassword';
    }

    const p = getNormalizedPath(raw);

    if (p === '/' || p === '' || p === '/home') return 'home';
    if (p === '/tutor') return 'home';
    if (p === '/qa') return 'home';
    if (p.startsWith('/profile/edit')) return 'editProfile';
    if (p.startsWith('/profile')) return 'profile';
    if (p.startsWith('/create-account')) return 'createAccount';
    if (p.startsWith('/signin')) return 'signin';
    if (p.startsWith('/reset-password')) return 'resetPassword';
    if (p.startsWith('/create-post')) return 'createPost';
    if (p.startsWith('/admin')) return 'admin';
    if (p.startsWith('/calendar')) return 'calendar';
    if (p.startsWith('/groupmessage')) return 'groupmessage';
    return 'home';
  };

  const extractFeedFromRaw = (raw) => {
    const p = getNormalizedPath(raw);

    if (p === '/tutor' || p.startsWith('/tutor/')) return 'tutor';
    if (p === '/qa' || p.startsWith('/qa/')) return 'qa';
    return null;
  };

  const extractPostRefFromRaw = (raw) => {
    const p = getNormalizedPath(raw);
    const params = getActionParams(raw);

    let backHash = null;
    if (params.get('origin') === 'calendar') {
      backHash = buildCalendarHash({
        selectedDateKey: params.get('calendarDate') || null,
        feed: params.get('calendarFeed') || null,
      });
    } else if (params.get('origin') === 'profile') {
      backHash = '#/profile';
    }

    const tutorMatch = p.match(/^\/tutor\/([^/]+)$/);
    if (tutorMatch) return { type: 'tutor', id: tutorMatch[1], backHash };

    const qaMatch = p.match(/^\/qa\/([^/]+)$/);
    if (qaMatch) return { type: 'qa', id: qaMatch[1], backHash };

    return null;
  };

  const extractCalendarRouteState = (raw) => {
    const params = getActionParams(raw);
    const selectedDateKey = params.get('date') || null;
    const feed = params.get('feed');

    return {
      selectedDateKey,
      feed: feed === 'qa' || feed === 'tutor' ? feed : null,
    };
  };

  const extractProfileUidFromRaw = (raw) => {
    const p = getNormalizedPath(raw);

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
    // Only reset detail open if URL is not pointing at a post detail
    if (!extractPostRefFromRaw(window.location.hash || window.location.pathname)) {
      setIsFeedDetailOpen(false);
    }

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
      case 'resetPassword':
        setActivePage('resetPassword');
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
        } else {
          setActivePage('calendar');
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
    // Only reset detail open if URL is not pointing at a post detail
    if (!extractPostRefFromRaw(window.location.hash || window.location.pathname)) {
      setIsFeedDetailOpen(false);
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
      case 'resetPassword':
        setActivePage('resetPassword');
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

      const calendarState = extractCalendarRouteState(raw);
      if (p === 'calendar' && calendarState.feed) {
        setActiveFeed(calendarState.feed);
      }

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

    const initialCalendarState = extractCalendarRouteState(raw);
    if (initial === 'calendar' && initialCalendarState.feed) {
      setActiveFeed(initialCalendarState.feed);
    }

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

  useEffect(() => {
    const nextFeed = activeFeed === 'qa' ? 'qa' : 'tutor';
    if (displayFeed === nextFeed) return;

    setFeedTransitionPhase('out');

    let inTimerId = null;
    const outTimerId = window.setTimeout(() => {
      setDisplayFeed(nextFeed);
      setFeedTransitionPhase('in');
      inTimerId = window.setTimeout(() => {
        setFeedTransitionPhase('idle');
      }, 280);
    }, 170);

    return () => {
      window.clearTimeout(outTimerId);
      if (inTimerId) window.clearTimeout(inTimerId);
    };
  }, [activeFeed, displayFeed]);

  useEffect(() => {
    if (!isHome) return;

    if (!hasFilterInitializedRef.current) {
      hasFilterInitializedRef.current = true;
      return;
    }

    setIsFilterTransitioning(true);
    const timerId = window.setTimeout(() => {
      setIsFilterTransitioning(false);
    }, 220);

    return () => window.clearTimeout(timerId);
  }, [searchQuery, category, isHome]);

  useEffect(() => {
    if (!isCategoryMenuOpen) return;

    const handleOutsidePointer = (event) => {
      if (!categoryMenuRef.current) return;
      if (categoryMenuRef.current.contains(event.target)) return;
      setIsCategoryMenuOpen(false);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsCategoryMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsidePointer);
    window.addEventListener('touchstart', handleOutsidePointer);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleOutsidePointer);
      window.removeEventListener('touchstart', handleOutsidePointer);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (isHome && !isFeedDetailOpen) return;
    setIsCategoryMenuOpen(false);
  }, [isHome, isFeedDetailOpen]);



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

  const pageTransitionKey = activePage;
  const pageTransitionClassName = `app-page-transition ${isGroupMessagePage ? 'app-page-transition-static' : ''}`.trim();

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
        onCreatePost={handleShowCreatePost}
      />
      <div
        className={`app-root ${(isFeedDetailOpen || Boolean(openPostRef) || isGroupMessagePage) ? 'app-root-detail-open' : ''} ${isResetPasswordPage ? 'app-root-reset-password' : ''}`.trim()}
      >
        <div key={pageTransitionKey} className={pageTransitionClassName}>
          {isGroupMessagePage ? (
            <GroupMessagePage onBack={() => {
              const _params = getActionParams(window.location.hash || window.location.pathname);
              if (_params.get('origin') === 'profile') {
                navigateTo('profile');
              } else {
                navigateTo('home');
              }
            }} />
          ) : isCalendarPage ? (
            <Calendar
              tutorPosts={tutorPosts}
              qaPosts={qaPosts}
              feedType={activeFeed}
              routeSelectedDateKey={extractCalendarRouteState(window.location.hash || window.location.pathname).selectedDateKey}
              isAdminView={Boolean(isAdmin)}
              onBack={() => navigateTo('home')}
              onChangeFeedType={setActiveFeed}
              onDeletePost={(post) => {
                const postType = post?.type === 'qa' ? 'qa' : 'tutor';
                handleDeletePost({ type: postType, id: post?.id });
              }}
            />
          ) : isAdminPage ? (
            <AdminPanel />
          ) : isResetPasswordPage ? (
            <ResetPassword onNavigate={navigateTo} />
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

                    <div
                      ref={categoryMenuRef}
                      className={`category-dropdown-wrap ${isCategoryMenuOpen ? 'open' : ''}`.trim()}
                    >
                      <button
                        className={`category-dropdown-trigger ${category ? 'has-value' : ''}`.trim()}
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={isCategoryMenuOpen}
                        aria-label="Choose subject category"
                        onClick={() => setIsCategoryMenuOpen((prev) => !prev)}
                      >
                        <span className="category-dropdown-text">{categoryDisplayLabel}</span>
                        <span className="category-dropdown-caret" aria-hidden="true">▾</span>
                      </button>

                      <div
                        className={`category-dropdown-menu ${isCategoryMenuOpen ? 'open' : ''}`.trim()}
                        role="listbox"
                        aria-label="Subject category list"
                      >
                        <button
                          type="button"
                          className={`category-option ${category === '' ? 'active' : ''}`.trim()}
                          onClick={() => {
                            setCategory('');
                            setIsCategoryMenuOpen(false);
                          }}
                        >
                          All Subjects
                        </button>

                        {allSubjects.map((subject) => (
                          <button
                            key={subject}
                            type="button"
                            className={`category-option ${category === subject ? 'active' : ''}`.trim()}
                            onClick={() => {
                              setCategory(subject);
                              setIsCategoryMenuOpen(false);
                            }}
                          >
                            {subject}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Feed (still renders while viewing a detail) */}
              {isHome && (
                <div
                  className={`feed-switch-transition ${feedTransitionPhase === 'out' ? 'is-out' : ''} ${feedTransitionPhase === 'in' ? 'is-in' : ''} ${isFilterTransitioning ? 'is-filtering' : ''}`.trim()}
                >
                  {displayFeed === 'tutor' ? (
                    <TutorFeed
                      posts={filteredTutorPosts}
                      openPostId={displayFeed === 'tutor' && openPostRef?.type === 'tutor' ? openPostRef.id : null}
                      detailBackHash={displayFeed === 'tutor' && openPostRef?.type === 'tutor' ? openPostRef.backHash : null}
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
                      openPostId={displayFeed === 'qa' && openPostRef?.type === 'qa' ? openPostRef.id : null}
                      detailBackHash={displayFeed === 'qa' && openPostRef?.type === 'qa' ? openPostRef.backHash : null}
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
                  allSubjects={allSubjects}
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
      {!isAuthPage && !isResetPasswordPage && !showCreatePost && !isAdminPage && (!isFeedDetailOpen || openPostRef?.type !== 'qa') && (
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

