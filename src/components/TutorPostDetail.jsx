import React, { useEffect, useState } from 'react';
import { MdArrowBack, MdLocationOn } from 'react-icons/md';
import { FaRegUserCircle } from 'react-icons/fa';
import './TutorPostDetail.css';
import ImagePreviewModal from './ImagePreviewModal';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import {
  createGroup,
  getGroupByPostId,
  addMemberToGroup,
  sendSystemMessage,
} from './groupMessageApi';

const TutorPostDetail = ({ post, onBack, onDelete }) => {
  const { user, profile, isAdmin } = useAuth();
  const [isJoinInfoOpen, setIsJoinInfoOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [authorBio, setAuthorBio] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    const authorId = post?.authorId || post?.user?.uid || null;
    if (!authorId) {
      setAuthorBio('');
      return undefined;
    }

    if (!isFirebaseConfigured()) {
      setAuthorBio('');
      return undefined;
    }

    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', authorId);

    return onSnapshot(
      userRef,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setAuthorBio(data?.bio || '');
      },
      (err) => {
        console.error('Failed to load author profile bio', err);
        setAuthorBio('');
      }
    );
  }, [post?.authorId, post?.user]);

  // Check if current user has already joined
  useEffect(() => {
    if (!user?.uid || !post?.joiners) {
      setHasJoined(false);
      return;
    }
    const joiners = Array.isArray(post.joiners) ? post.joiners : [];
    const userHasJoined = joiners.some(joiner => joiner?.uid === user.uid || joiner?.id === user.uid);
    setHasJoined(userHasJoined);
  }, [user?.uid, post?.joiners]);

  // Handle join button click
  const handleJoinPost = async () => {
    if (!user?.uid || !profile?.displayName) {
      setJoinError('Please sign in first');
      return;
    }

    if (hasJoined) {
      setJoinError('You have already joined this post');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      // 1. Check if group exists for this post
      let groupId = null;
      const existingGroup = await getGroupByPostId(post.id);
      
      if (existingGroup) {
        groupId = existingGroup.id;
      } else {
        // Create group if it doesn't exist
        const authorId = post?.authorId || post?.user?.uid;
        const authorName = post?.user?.name || 'Unknown';
        groupId = await createGroup(
          post.id,
          post.title || post.topic,
          post.subject,
          authorId,
          authorName
        );
      }

      // 2. Add current user to group
      await addMemberToGroup(groupId, user.uid, profile.displayName);

      // 3. Update post with new joiner
      if (isFirebaseConfigured()) {
        const { db } = getFirebaseServices();
        const postRef = doc(db, 'tutorPosts', post.id);
        
        const newJoiner = {
          uid: user.uid,
          name: profile.displayName,
          avatar: profile.photoURL || null,
        };

        await updateDoc(postRef, {
          joiners: arrayUnion(newJoiner),
        });
      }

      // 4. Send system message to group
      try {
        await sendSystemMessage(
          groupId,
          `${profile.displayName} joined the group`
        );
      } catch (err) {
        console.warn('Failed to send system message:', err);
        // Don't fail the whole join if system message fails
      }

      setHasJoined(true);
    } catch (err) {
      console.error('Error joining post:', err);
      setJoinError(err.message || 'Failed to join post');
    } finally {
      setIsJoining(false);
    }
  };

  if (!post) return null;

  const {
    user: postAuthor,
    subject,
    hours,
    capacity,
    description,
    experience,
    location,
    joinedCount,
  } = post;

  const joiners = post.joiners ?? [];
  const safeJoinedCount = joinedCount ?? joiners.length;

  const capacityNumber = capacity ?? 0;
  if (isJoinInfoOpen) {
    return (
      <div className="tutor-post-detail tutor-joininfo">
        {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
        <div className="joininfo-topbar">
          <button
            className="joininfo-back"
            onClick={() => setIsJoinInfoOpen(false)}
            type="button"
            aria-label="Back"
          >
            <MdArrowBack size={24} />
          </button>
        </div>

        <div className="joininfo-body">
          <div className="location-box">
            <div className="location-icon" aria-hidden="true">
              <MdLocationOn size={24} color="#1a2b48" />
            </div>
            <p className="location-text">สถานที่ติว : {location}</p>
          </div>

          <div className="joined-status">
            <span className="joined-text">
              <span className="bold-text">{safeJoinedCount}</span>/<span className="bold-text">{capacityNumber}</span> joined
            </span>
          </div>

          <div className="joiners-list">
            {joiners.map((joiner, index) => (
              <div key={index} className="joiner-item">
                <div className="profile-icon" aria-hidden="true">
                  <FaRegUserCircle size={30} />
                </div>
                <p className="joiner-name">{joiner?.name}</p>
                <p className="joined-text">joined</p>
              </div>
            ))}
          </div>
        </div>

        {joinError && (
          <div style={{
            backgroundColor: '#ffe6e6',
            color: '#cc0000',
            padding: '10px',
            borderRadius: '6px',
            margin: '10px 16px',
            fontSize: '14px',
          }}>
            {joinError}
          </div>
        )}
        <button
          className="join-button"
          type="button"
          onClick={handleJoinPost}
          disabled={isJoining || hasJoined}
        >
          {isJoining ? 'Joining...' : (hasJoined ? 'Joined' : 'join')}
        </button>
      </div>
    );
  }

  return (
    <div className="tutor-post-detail">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
      {/* Top Section */}
      <div className="top-section">
        <button className="back-button" onClick={onBack} type="button" aria-label="Back">
          <MdArrowBack size={24} />
        </button>
        {isAdmin && typeof onDelete === 'function' ? (
          <button
            className="tutor-delete-button"
            type="button"
            onClick={() => onDelete()}
          >
            Delete
          </button>
        ) : null}
        <button
          type="button"
          className="profile-circle tutor-avatar-button"
          aria-label="Open profile image"
          onClick={() => {
            if (postAuthor?.avatar) setPreviewSrc(postAuthor.avatar);
          }}
          disabled={!postAuthor?.avatar}
        >
          {postAuthor?.avatar ? <img className="tutor-avatar-img" src={postAuthor.avatar} alt="" /> : <FaRegUserCircle size={100} />}
        </button>
      </div>

      {/* Middle Section */}
      <div className="middle-section">
        <div className="header">
          <h1 className="user-name">{postAuthor?.name}</h1>
          <p className="subject">Subject : {subject}</p>
        </div>

        {Array.isArray(post.images) && post.images.length > 0 ? (
          <div className="tutor-post-images">
            {post.images.map((imageUrl, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Open image ${index + 1}`}
                onClick={() => setPreviewSrc(imageUrl)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <img className="tutor-post-image" src={imageUrl} alt="" />
              </button>
            ))}
          </div>
        ) : post.imageUrl ? (
          <button
            type="button"
            aria-label="Open image"
            onClick={() => setPreviewSrc(post.imageUrl)}
            style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer' }}
          >
            <img className="tutor-post-image" src={post.imageUrl} alt="" />
          </button>
        ) : null}

        <div className="summary-card">
          <div className="summary-column">
            <span className="bold-text">{hours} Hrs</span>
            <span className="small-text">tutoring hours</span>
          </div>
          <div className="summary-column">
            <span className="bold-text">{capacity} People</span>
            <span className="small-text">capacity</span>
          </div>
          <div className="summary-column">
            <button
              className="see-all-button"
              type="button"
              onClick={() => setIsJoinInfoOpen(true)}
            >
              See All
            </button>
            <span className="small-text">see who's joining</span>
          </div>
        </div>

        <div className="details-section">
          <h2 className="section-title">รายละเอียด</h2>
          <div className="detail-box">
            <p>{description}</p>
          </div>
        </div>

        <div className="experience-section">
          <h2 className="section-title">แนะนำตัว/ประสบการณ์</h2>
          <div className="experience-box">
            <p>{authorBio || experience || '-'}</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div style={{ width: '100%' }}>
        {joinError && (
          <div style={{
            backgroundColor: '#ffe6e6',
            color: '#cc0000',
            padding: '10px',
            borderRadius: '6px',
            marginBottom: '10px',
            fontSize: '14px',
            marginLeft: '16px',
            marginRight: '16px',
            marginTop: '10px',
          }}>
            {joinError}
          </div>
        )}
        <button
          className="join-button"
          type="button"
          onClick={handleJoinPost}
          disabled={isJoining || hasJoined}
        >
          {isJoining ? 'Joining...' : (hasJoined ? 'Joined' : 'join')}
        </button>
      </div>
    </div>
  );
};

export default TutorPostDetail;