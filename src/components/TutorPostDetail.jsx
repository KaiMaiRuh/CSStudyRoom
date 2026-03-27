import React, { useState, useEffect } from 'react';
import { MdArrowBack, MdLocationOn } from 'react-icons/md';
import { FaRegUserCircle } from 'react-icons/fa';
import './TutorPostDetail.css';
import ImagePreviewModal from './ImagePreviewModal';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';

const TutorPostDetail = ({ post, onBack }) => {
  const { user: currentUser } = useAuth();
  const [isJoinInfoOpen, setIsJoinInfoOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [livePost, setLivePost] = useState(post);

  // Set up real-time listener for post updates
  useEffect(() => {
    if (!post?.id || !isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const postRef = doc(db, 'tutorPosts', post.id);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(postRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const postData = docSnapshot.data();
        
        // Construct user object from author fields if not already present
        const enrichedPost = {
          id: docSnapshot.id,
          ...postData,
          user: postData.user || {
            name: postData.authorName || 'Unknown',
            displayName: postData.authorName || 'Unknown',
            avatar: postData.authorAvatar || '',
            uid: postData.authorId || null,
          },
        };

        setLivePost(enrichedPost);
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [post?.id]);

  const displayPost = livePost || post;
  if (!displayPost) return null;

  const {
    id: postId,
    user,
    subject,
    hours,
    capacity,
    description,
    experience,
    location,
    joinedCount,
    authorId,
  } = displayPost;

  const joiners = displayPost.joiners ?? [];
  
  // Include the author as the first joiner
  const allJoiners = [
    {
      name: user?.displayName || user?.name || 'Unknown',
      avatar: user?.avatar || '',
      uid: user?.uid || authorId,
    },
    ...joiners.filter(j => j.uid !== (user?.uid || authorId))
  ];

  const safeJoinedCount = joinedCount ?? allJoiners.length;
  const capacityNumber = capacity ?? 0;
  
  // Check if current user already joined
  const hasUserJoined = joiners.some(j => j.uid === currentUser?.uid) || 
                        (user?.uid === currentUser?.uid);
  
  // Check if room is full
  const isFull = safeJoinedCount >= capacityNumber && capacityNumber > 0;

  const handleJoin = async () => {
    if (!isFirebaseConfigured()) {
      console.log('Firebase not configured');
      return;
    }

    if (!currentUser?.uid) {
      alert('Please sign in to join');
      return;
    }

    if (hasUserJoined) {
      alert('You have already joined this session');
      return;
    }

    if (isFull) {
      alert('This tutoring session is full');
      return;
    }

    try {
      setIsJoining(true);
      const { db } = getFirebaseServices();
      const postRef = doc(db, 'tutorPosts', postId);
      
      // Get joiner avatar from auth first, fallback to users collection
      let joinerAvatar = currentUser.photoURL || '';
      if (!joinerAvatar) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            joinerAvatar = userSnap.data()?.avatarUrl || userSnap.data()?.photoURL || '';
          }
        } catch (err) {
          console.warn('Failed to fetch joiner avatar:', err);
        }
      }
      
      const newJoiner = {
        uid: currentUser.uid,
        name: currentUser.displayName || currentUser.email || 'User',
        avatar: joinerAvatar,
      };

      await updateDoc(postRef, {
        joiners: arrayUnion(newJoiner),
        joinedCount: (safeJoinedCount) + 1,
      });

      console.log('Successfully joined the tutoring session');
    } catch (err) {
      console.error('Failed to join:', err);
      alert(err?.message || 'Failed to join');
    } finally {
      setIsJoining(false);
    }
  };
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
            {allJoiners.map((joiner, index) => (
              <div key={index} className="joiner-item">
                <button
                  type="button"
                  className="joiner-avatar"
                  aria-label="Profile"
                  onClick={() => {
                    if (joiner?.avatar) setPreviewSrc(joiner.avatar);
                  }}
                  disabled={!joiner?.avatar}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: joiner?.avatar ? 'pointer' : 'default',
                  }}
                >
                  {joiner?.avatar ? (
                    <img src={joiner.avatar} alt={joiner?.name} className="joiner-avatar-img" />
                  ) : (
                    <FaRegUserCircle size={40} />
                  )}
                </button>
                <p className="joiner-name">{joiner?.name || 'Unknown'}</p>
                <p className="joined-label">{index === 0 ? 'created' : 'joined'}</p>
              </div>
            ))}
          </div>
        </div>

        <button className="join-button" type="button" onClick={handleJoin} disabled={isFull || isJoining || hasUserJoined}>
          {isFull ? 'Full' : isJoining ? 'Joining...' : hasUserJoined ? 'Joined' : 'join'}
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
        <button
          type="button"
          className="profile-circle tutor-avatar-button"
          aria-label="Open profile image"
          onClick={() => {
            if (user?.avatar) setPreviewSrc(user.avatar);
          }}
          disabled={!user?.avatar}
        >
          {user?.avatar ? <img className="tutor-avatar-img" src={user.avatar} alt="" /> : <FaRegUserCircle size={100} />}
        </button>
      </div>

      {/* Middle Section */}
      <div className="middle-section">
        <div className="header">
          <h1 className="user-name">{user?.displayName || user?.name || 'Unknown'}</h1>
          <p className="subject">Subject : {subject}</p>
        </div>

        {Array.isArray(displayPost.images) && displayPost.images.length > 0 ? (
          <div className="tutor-post-images">
            {displayPost.images.map((imageUrl, index) => (
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
        ) : displayPost.imageUrl ? (
          <button
            type="button"
            aria-label="Open image"
            onClick={() => setPreviewSrc(displayPost.imageUrl)}
            style={{ background: 'none', border: 'none', padding: 0, width: '100%', cursor: 'pointer' }}
          >
            <img className="tutor-post-image" src={displayPost.imageUrl} alt="" />
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
            <p>{experience}</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="join-button" type="button" onClick={handleJoin} disabled={isFull || isJoining || hasUserJoined}>
        {isFull ? 'Full' : isJoining ? 'Joining...' : hasUserJoined ? 'Joined' : 'join'}
      </button>
    </div>
  );
};

export default TutorPostDetail;
