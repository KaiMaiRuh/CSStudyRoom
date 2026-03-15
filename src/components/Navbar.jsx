// src/components/Navbar.jsx
import React from 'react';
import './Navbar.css';

const Navbar = ({ onLogout, isLoggedIn, onCreatePost, onViewProfile, onCreateAccount }) => {
  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-container">
          <div className="logo-icon">📚</div>
          <span className="logo-text">CS Study Room</span>
        </div>
      </div>
      
      <div className="navbar-right">
        <button className="nav-button home-button">Home</button>
        <button className="nav-button" onClick={onCreatePost}>Create Post</button>
        <div className="profile-icon" role="button" tabIndex={0} onClick={onViewProfile} onKeyPress={(e)=>{ if(e.key==='Enter') onViewProfile(); }}>👤</div>
        {isLoggedIn ? (
          <button className="nav-button logout-button" onClick={onLogout}>Log out</button>
        ) : (
          <button className="nav-button signup-button" onClick={onCreateAccount}>Sign up</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;