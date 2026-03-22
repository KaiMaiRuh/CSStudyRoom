/* Profile component */
import React, { useEffect, useMemo, useState } from 'react';
import { FaCamera, FaUserCircle } from 'react-icons/fa';
import './Profile.css';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

const Profile = ({ tutorPosts = [], qaPosts = [], onEdit, onEditPost, onDeletePost }) => {
  const { user } = useAuth();
  const [profileState, setProfileState] = useState({ uid: null, data: null });

  useEffect(() => {
    if (!user?.uid) return;
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', user.uid);

    return onSnapshot(
      ref,
      (snap) => {
        setProfileState({ uid: user.uid, data: snap.exists() ? snap.data() : null });
      },
      (err) => {
        console.error('Failed to load profile', err);
      }
    );
  }, [user?.uid]);

  const profileDoc = user?.uid && profileState.uid === user.uid ? profileState.data : null;

  const userProfile = useMemo(() => {
    const docData = profileDoc || {};
    const displayName = docData.displayName || user?.displayName || user?.email || 'User';
    const education = docData.education || {};
    const contact = docData.contact || {};
    const contactFromLegacy = [contact.discord, contact.line].filter(Boolean).join(' / ');

    const mergedYear = docData.year || education.year || '';

    return {
      name: displayName,
      username: docData.username || '',
      education: {
        year: mergedYear,
        major: education.major || '',
        university: education.university || '',
      },
      subjectsToTutor: Array.isArray(docData.subjectsToTutor) ? docData.subjectsToTutor : [],
      subjectsNeedingHelp: Array.isArray(docData.subjectsNeedingHelp) ? docData.subjectsNeedingHelp : [],
      role: docData.role || '',
      contactText: docData.contactText || contactFromLegacy || '',
      bio: docData.bio || '',
    };
  }, [profileDoc, user?.displayName, user?.email]);

  const pastPosts = useMemo(() => {
    const uid = user?.uid;
    if (!uid) return [];

    const tutor = (Array.isArray(tutorPosts) ? tutorPosts : [])
      .filter((p) => p?.authorId === uid)
      .map((p) => ({
        id: `tutor-${p.id}`,
        rawId: p.id,
        type: 'tutor',
        title: p.title || p.subject || 'Tutor post',
        date: p.date || '',
        description: p.description || '',
        raw: p,
      }));

    const qa = (Array.isArray(qaPosts) ? qaPosts : [])
      .filter((p) => p?.authorId === uid)
      .map((p) => ({
        id: `qa-${p.id}`,
        rawId: p.id,
        type: 'qa',
        title: p.question || p.subject || 'Q&A post',
        date: p.date || '',
        description: p.description || '',
        raw: p,
      }));

    return [...tutor, ...qa].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [tutorPosts, qaPosts, user?.uid]);

  const normalizedRole = String(userProfile.role || '').toLowerCase();
  const showTutorSubjects = normalizedRole === 'tutor' || normalizedRole === 'both';
  const showStudentSubjects = normalizedRole === 'student' || normalizedRole === 'both';

  return (
    <div className="profile-container">
      {/* Top */}
      <div className="profile-header">
        <div className="profile-circle">
          <div className="camera-icon"><FaCamera /></div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userProfile.name}</h1>
          {userProfile.username && <div style={{ color: '#666', marginTop: 4 }}>@{userProfile.username}</div>}
          <button className="edit-profile-btn" type="button" onClick={() => onEdit?.()}>
            Edit profile
          </button>
        </div>
      </div>

      <div className="divider"></div>

      {/* Bottom */}
      <div className="profile-content">
        {/* Left - Info */}
        <div className="profile-left-panel">
          <div className="user-info-section">
            <h2>Education</h2>
            <p><strong>Year:</strong> {userProfile.education.year}</p>
            <p><strong>Major:</strong> {userProfile.education.major}</p>
            <p><strong>University:</strong> {userProfile.education.university}</p>
          </div>

          {showTutorSubjects && (
            <div className="subjects-section">
              <h2>Subjects to Tutor</h2>
              <ul>
                {(userProfile.subjectsToTutor.length ? userProfile.subjectsToTutor : ['-']).map((subject, index) => (
                  <li key={index}>{subject}</li>
                ))}
              </ul>
            </div>
          )}

          {showStudentSubjects && (
            <div className="subjects-section">
              <h2>Subjects Needing Help</h2>
              <ul>
                {(userProfile.subjectsNeedingHelp.length ? userProfile.subjectsNeedingHelp : ['-']).map((subject, index) => (
                  <li key={index}>{subject}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="info-section">
            <h2>Role</h2>
            <p>{userProfile.role || '-'}</p>
          </div>

          <div className="contact-section">
            <h2>Contact</h2>
            <p>{userProfile.contactText || '-'}</p>
          </div>

          <div className="bio-section">
            <h2>Bio/Experience</h2>
            <p>{userProfile.bio || '-'}</p>
          </div>
        </div>

        {/* Right - Posts */}
        <div className="profile-right-panel">
          <div className="posts-header">
            <h2>Past Posts</h2>
          </div>
          
          <div className="posts-list">
            {pastPosts.map((post) => (
              <div key={post.id} className="post-card">
                <div className="post-icon"><FaUserCircle /></div>
                <div className="post-details">
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <p className="post-date">{post.date}</p>
                </div>
                <div className="post-actions">
                  <button
                    className="edit-btn"
                    type="button"
                    onClick={() => onEditPost?.({ type: post.type, id: post.rawId, post: post.raw })}
                  >
                    Edit
                  </button>
                  <button
                    className="delete-btn"
                    type="button"
                    onClick={() => onDeletePost?.({ type: post.type, id: post.rawId, post: post.raw })}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;