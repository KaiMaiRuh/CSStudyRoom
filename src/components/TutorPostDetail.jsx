import React, { useEffect, useState } from 'react';
import { MdArrowBack, MdLocationOn } from 'react-icons/md';
import { FaRegUserCircle } from 'react-icons/fa';
import './TutorPostDetail.css';
import ImagePreviewModal from './ImagePreviewModal';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import {
  createGroup,
  getGroupByPostId,
  addMemberToGroup,
  removeMemberFromGroup,
  sendSystemMessage,
} from './groupMessageApi';

const TutorPostDetail = ({ post, onBack, onDelete }) => {
  const { user, profile, isAdmin } = useAuth();
  const [isJoinInfoOpen, setIsJoinInfoOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [authorBio, setAuthorBio] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [livePost, setLivePost] = useState(post);
  const [resolvedJoiners, setResolvedJoiners] = useState({});

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

  useEffect(() => {
    if (!post?.id || !isFirebaseConfigured()) return undefined;

    const { db } = getFirebaseServices();
    const postRef = doc(db, 'tutorPosts', post.id);

    const unsubscribe = onSnapshot(
      postRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const postData = docSnapshot.data();
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
      },
      (err) => {
        console.error('Failed to listen to post changes', err);
      }
    );

    return () => unsubscribe();
  }, [post?.id]);

  const displayPost = livePost || post;

  // Check if current user has already joined
  useEffect(() => {
    if (!user?.uid || !displayPost?.joiners) {
      setHasJoined(false);
      return;
    }
    const joiners = Array.isArray(displayPost.joiners) ? displayPost.joiners : [];
    const userHasJoined = joiners.some(joiner => joiner?.uid === user.uid || joiner?.id === user.uid);
    // do NOT automatically set owner as joined for the button state
    setHasJoined(userHasJoined);
  }, [user?.uid, displayPost?.joiners]);

  // Handle join button click
  const handleJoinPost = async () => {
    if (!user?.uid || !profile?.displayName) {
      setJoinError('Please sign in first');
      return;
    }

    const postOwnerUid = postAuthor?.uid || authorId;
    const isOwner = user?.uid && postOwnerUid && user.uid === postOwnerUid;

    if (isOwner) {
      setJoinError('Owner cannot join their own tutoring post');
      return;
    }

    if (hasJoined) {
      setJoinError('You have already joined this post');
      return;
    }

    if (isFull) {
      setJoinError('This tutoring session is full');
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

  const handleLeavePost = async () => {
    if (!user?.uid || !profile?.displayName) {
      setJoinError('Please sign in first');
      return;
    }

    if (isOwner) {
      setJoinError('Owner cannot leave their own tutoring post');
      return;
    }

    if (!hasJoined) {
      setJoinError('You are not joined to this post');
      return;
    }

    setIsLeaving(true);
    setJoinError(null);

    try {
      const existingGroup = await getGroupByPostId(post.id);
      if (existingGroup) {
        await removeMemberFromGroup(existingGroup.id, user.uid);
      }

      if (isFirebaseConfigured()) {
        const { db } = getFirebaseServices();
        const postRef = doc(db, 'tutorPosts', post.id);

        const rawJoiners = Array.isArray(displayPost.joiners) ? displayPost.joiners : [];
        const updatedJoiners = rawJoiners.filter(
          (joiner) => joiner?.uid !== user.uid && joiner?.id !== user.uid
        );

        await updateDoc(postRef, {
          joiners: updatedJoiners,
        });
      }

      if (existingGroup) {
        try {
          await sendSystemMessage(
            existingGroup.id,
            `${profile.displayName} left the group`
          );
        } catch (err) {
          console.warn('Failed to send system message:', err);
        }
      }

      setHasJoined(false);
    } catch (err) {
      console.error('Error leaving post:', err);
      setJoinError(err.message || 'Failed to leave post');
    } finally {
      setIsLeaving(false);
    }
  };

  const {
    user: postAuthor,
    subject,
    hours,
    capacity,
    description,
    experience,
    location,
    authorId,
  } = displayPost || {};

  const postOwnerUid = postAuthor?.uid || authorId || null;

  const rawJoiners = Array.isArray(displayPost.joiners) ? displayPost.joiners : [];
  const normalizedJoiners = rawJoiners
    .map((j) => ({
      uid: j?.uid || j?.id || '',
      name: j?.name || j?.displayName || 'Unknown',
      avatar: j?.avatar || j?.photoURL || '',
    }))
    .filter((j) => j.uid && j.uid !== postOwnerUid);

  const uniqueJoiners = Array.from(
    new Map(normalizedJoiners.map((j) => [j.uid, j])).values()
  );

  const plainAuthor = {
    uid: postOwnerUid,
    name: postAuthor?.displayName || postAuthor?.name || 'Unknown',
    avatar: postAuthor?.avatar || '',
  };

  const allJoiners = [plainAuthor, ...uniqueJoiners];
  const joinedTotalCount = allJoiners.length; // creator + unique joiners
  const capacityNumber = capacity ?? 0;
  const displayJoinedCount = capacityNumber > 0 ? Math.min(joinedTotalCount, capacityNumber) : joinedTotalCount;
  const isFull = capacityNumber > 0 && joinedTotalCount >= capacityNumber;
  const isOwner = user?.uid && postOwnerUid && user.uid === postOwnerUid;

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    if (!uniqueJoiners.length) return;

    const missing = uniqueJoiners.filter((j) => !j.avatar && j.uid);
    if (!missing.length) return;

    const fetchMissing = async () => {
      try {
        const { db } = getFirebaseServices();
        const updates = {};
        await Promise.all(
          missing.map(async (j) => {
            const userDoc = await getDoc(doc(db, 'users', j.uid));
            if (userDoc.exists()) {
              const data = userDoc.data();
              const foundAvatar = data?.avatarUrl || data?.photoURL || '';
              if (foundAvatar) updates[j.uid] = foundAvatar;
            }
          })
        );
        if (Object.keys(updates).length > 0) {
          setResolvedJoiners((prev) => ({ ...prev, ...updates }));
        }
      } catch (err) {
        console.warn('Failed to load missing joiners avatar', err);
      }
    };

    fetchMissing();
  }, [uniqueJoiners]);

  const joinButtonDisabled = isJoining || hasJoined || isFull || isOwner;
  const leaveButtonDisabled = isLeaving || !hasJoined || isOwner;
  const joinButtonText = isOwner
    ? 'Owner'
    : isFull
    ? 'Full'
    : isJoining
    ? 'Joining...'
    : hasJoined
    ? 'Joined'
    : 'join';
  const leaveButtonText = isLeaving ? 'Leaving...' : 'Leave';
  const showLeaveButton = hasJoined && !isOwner;

  if (!displayPost) return null;

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
              <span className="bold-text">{displayJoinedCount}</span>/<span className="bold-text">{capacityNumber}</span> joined
            </span>
          </div>

          <div className="joiners-list">
            {allJoiners.map((joiner, index) => (
              <div key={index} className="joiner-item">
                <div className="profile-icon" aria-hidden="true">
                  <FaRegUserCircle size={30} />
                </div>
                <button
                  type="button"
                  className="joiner-avatar"
                  aria-label="Profile"
                  onClick={() => {
                    const avatarUrl = joiner?.avatar || resolvedJoiners[joiner.uid];
                    if (avatarUrl) setPreviewSrc(avatarUrl);
                  }}
                  disabled={!(joiner?.avatar || resolvedJoiners[joiner.uid])}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: joiner?.avatar || resolvedJoiners[joiner.uid] ? 'pointer' : 'default',
                  }}
                >
                  {joiner?.avatar || resolvedJoiners[joiner.uid] ? (
                    <img src={joiner?.avatar || resolvedJoiners[joiner.uid]} alt={joiner?.name} className="joiner-avatar-img" />
                  ) : (
                    <FaRegUserCircle size={40} />
                  )}
                </button>
                <p className="joiner-name">{joiner?.name || 'Unknown'}</p>
                <p className="joined-text">{index === 0 ? 'created' : 'joined'}</p>
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
        <div className="action-button-row">
          <button
            className="join-button"
            type="button"
            onClick={handleJoinPost}
            disabled={joinButtonDisabled}
          >
            {joinButtonText}
          </button>
          {showLeaveButton && (
            <button
              className="leave-button"
              type="button"
              onClick={handleLeavePost}
              disabled={leaveButtonDisabled}
            >
              {leaveButtonText}
            </button>
          )}
        </div>
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
        <div className="action-button-row">
          <button
            className="join-button"
            type="button"
            onClick={handleJoinPost}
            disabled={joinButtonDisabled}
          >
            {joinButtonText}
          </button>
          {showLeaveButton && (
            <button
              className="leave-button"
              type="button"
              onClick={handleLeavePost}
              disabled={leaveButtonDisabled}
            >
              {leaveButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TutorPostDetail;