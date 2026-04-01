/* Navbar component */
import React from 'react';
import { FaUserCircle } from 'react-icons/fa';
import './Navbar.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import logoImage from '../../assets/Logo.png';

const Navbar = ({
  onLogout,
  isLoggedIn,
  activePage,
  onNavigate,
  disableCreatePost = false,
  showCreatePost = true,
  onCreatePost,
}) => {
  const { profile, isAdmin } = useAuth();
  const visibleAvatarUrl = isLoggedIn ? (profile?.avatarUrl || '') : '';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="logo-container"
          onClick={() => onNavigate?.('home')}
          aria-label="Go to Home"
        >
          <span className="logo-badge" aria-hidden="true">
            <img className="logo-image" src={logoImage} alt="" />
          </span>
          <span className="logo-wordmark" aria-hidden="true">
            <span className="logo-wordmark-accent">CS Stu</span>
            <span className="logo-wordmark-main">dyRoom</span>
          </span>
        </button>
      </div>
      
      <div className="navbar-right">
        <button className={`nav-button ${activePage === 'home' ? 'active' : ''} home-button`} onClick={() => onNavigate?.('home')}>Home</button>
        {isLoggedIn ? (
          <button
            className={`nav-button ${activePage === 'calendar' ? 'active' : ''} home-button`}
            onClick={() => onNavigate?.('calendar')}
          >
            Calendar
          </button>
        ) : null}
        {isAdmin ? (
          <button
            className={`nav-button ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => onNavigate?.('admin')}
          >
            Admin
          </button>
        ) : null}

        {showCreatePost && !isAdmin ? (
          <button
            className={`nav-button create-post-button ${activePage === 'createPost' ? 'active' : ''}`}
            onClick={() => {
              if (!disableCreatePost) {
                if (typeof onCreatePost === 'function') {
                  onCreatePost();
                } else {
                  onNavigate?.('createPost');
                }
              }
            }}
            disabled={disableCreatePost}
            aria-disabled={disableCreatePost}
          >
            Create Post
          </button>
        ) : null}
        {!isAdmin ? (
          <div className={`profile-icon ${activePage === 'profile' ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => onNavigate?.('profile')} onKeyPress={(e)=>{ if(e.key==='Enter') onNavigate?.('profile'); }}>
            {visibleAvatarUrl ? <img className="navbar-avatar-img" src={visibleAvatarUrl} alt="" /> : <FaUserCircle />}
          </div>
        ) : null}
        {isLoggedIn ? (
          <button className="nav-button logout-button" onClick={onLogout}>Log out</button>
        ) : (
          <button className={`nav-button signup-button ${activePage === 'signin' ? 'active' : ''}`} onClick={() => onNavigate?.('signin')}>Log in</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;