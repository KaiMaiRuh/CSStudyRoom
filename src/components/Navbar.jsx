/* Navbar component */
import React, { useEffect, useState } from 'react';
import { FaBook, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const Navbar = ({ onLogout, isLoggedIn, activePage, onNavigate, disableCreatePost = false }) => {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState('');
  const visibleAvatarUrl = isLoggedIn ? avatarUrl : '';

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!isFirebaseConfigured()) return;
    if (!user?.uid) return;

    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', user.uid);
    return onSnapshot(
      ref,
      (snap) => setAvatarUrl(snap.data()?.avatarUrl || ''),
      (err) => console.error('Failed to subscribe user profile for avatar', err)
    );
  }, [isLoggedIn, user?.uid]);

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