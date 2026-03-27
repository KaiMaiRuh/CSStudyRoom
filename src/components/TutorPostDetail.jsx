import React, { useState } from 'react';
import { MdArrowBack, MdLocationOn } from 'react-icons/md';
import { FaRegUserCircle } from 'react-icons/fa';
import './TutorPostDetail.css';
import ImagePreviewModal from './ImagePreviewModal';

const TutorPostDetail = ({ post, onBack }) => {
  const [isJoinInfoOpen, setIsJoinInfoOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState(null);

  if (!post) return null;

  const {
    user,
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

        <button className="join-button" type="button">
          join
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
          <h1 className="user-name">{user?.name}</h1>
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
            <p>{experience}</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="join-button" type="button">
        join
      </button>
    </div>
  );
};

export default TutorPostDetail;
