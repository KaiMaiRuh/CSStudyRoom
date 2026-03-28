/* Navbar component */
import React from 'react';
import { FaBook, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';
import { useAuth } from '../auth/AuthContext';

const Navbar = ({
  onLogout,
  isLoggedIn,
  activePage,
  onNavigate,
  disableCreatePost = false,
  showCreatePost = true,
}) => {
  const { profile, isAdmin } = useAuth();
  const visibleAvatarUrl = isLoggedIn ? (profile?.avatarUrl || '') : '';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-container">
          <div className="logo-icon"><FaBook /></div>
          <span className="logo-text">CS Study Room</span>
        </div>
      </div>
      
      <div className="navbar-right">
        <button className={`nav-button ${activePage === 'home' ? 'active' : ''} home-button`} onClick={() => onNavigate?.('home')}>Home</button>
        {isAdmin ? (
          <button
            className={`nav-button ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => onNavigate?.('admin')}
          >
            Admin
          </button>
        ) : null}

        {showCreatePost ? (
          <button
            className={`nav-button ${activePage === 'createPost' ? 'active' : ''}`}
            onClick={() => {
              if (!disableCreatePost) onNavigate?.('createPost');
            }}
            disabled={disableCreatePost}
            aria-disabled={disableCreatePost}
          >
            Create Post
          </button>
        ) : null}
        <div className={`profile-icon ${activePage === 'profile' ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => onNavigate?.('profile')} onKeyPress={(e)=>{ if(e.key==='Enter') onNavigate?.('profile'); }}>
          {visibleAvatarUrl ? <img className="navbar-avatar-img" src={visibleAvatarUrl} alt="" /> : <FaUserCircle />}
        </div>
        {isLoggedIn ? (
          <button className="nav-button logout-button" onClick={onLogout}>Log out</button>
        ) : (
          <button className={`nav-button signup-button ${activePage === 'signin' ? 'active' : ''}`} onClick={() => onNavigate?.('signin')}>Sign in</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;