/* Navbar component */
import React from 'react';
import { FaBook, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';

const Navbar = ({ onLogout, isLoggedIn, activePage, onNavigate, disableCreatePost = false }) => {
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
        <div className={`profile-icon ${activePage === 'profile' ? 'active' : ''}`} role="button" tabIndex={0} onClick={() => onNavigate?.('profile')} onKeyPress={(e)=>{ if(e.key==='Enter') onNavigate?.('profile'); }}>
          <FaUserCircle />
        </div>
        {isLoggedIn ? (
          <button className="nav-button logout-button" onClick={onLogout}>Log out</button>
        ) : (
          <button className={`nav-button signup-button ${activePage === 'createAccount' ? 'active' : ''}`} onClick={() => onNavigate?.('createAccount')}>Sign up</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;