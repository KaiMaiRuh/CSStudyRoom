/* Profile component */
import React, { useState } from 'react';
import { FaCamera, FaUserCircle } from 'react-icons/fa';
import './Profile.css';

const Profile = () => {
  const activeTab = 'posts';

  /* mock data */
  const userProfile = {
    name: "ABC DEFG",
    education: {
      year: "2077",
      major: "Computer Science",
      university: "Mor Gu Ni Lae"
    },
    subjectsToTutor: ["Mathematics", "Physics", "Programming"],
    subjectsNeedingHelp: ["Chemistry", "Biology"],
    role: "Both",
    contact: {
      discord: "abc_defg#1234",
      line: "@abcde123 meejaitakma"
    },
    bio: "I want to Gen AI all the things",
    pastPosts: [
      {
        id: 1,
        type: "tutor",
        title: "Cooking Study Group",
        date: "2023-05-15",
        description: "Cooking the omelet Why it's so hard"
      },
      {
        id: 2,
        type: "qa",
        title: "How to create a web",
        date: "2023-05-10",
        description: "I can't create a web I can't write a code someone help me please"
      },
      {
        id: 3,
        type: "tutor",
        title: "ใส่อะไรดีวะตรงนี้",
        date: "2023-05-05",
        description: "เดี๋ยวเจนaiมาใส่"
      }
    ]
  };

  return (
    <div className="profile-container">
      {/* Top */}
      <div className="profile-header">
        <div className="profile-circle">
          <div className="camera-icon"><FaCamera /></div>
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userProfile.name}</h1>
          <button className="edit-profile-btn">Edit profile</button>
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

          <div className="subjects-section">
            <h2>Subjects to Tutor</h2>
            <ul>
              {userProfile.subjectsToTutor.map((subject, index) => (
                <li key={index}>{subject}</li>
              ))}
            </ul>
          </div>

          <div className="subjects-section">
            <h2>Subjects Needing Help</h2>
            <ul>
              {userProfile.subjectsNeedingHelp.map((subject, index) => (
                <li key={index}>{subject}</li>
              ))}
            </ul>
          </div>

          <div className="info-section">
            <h2>Role</h2>
            <p>{userProfile.role}</p>
          </div>

          <div className="contact-section">
            <h2>Contact</h2>
            <p><strong>Discord:</strong> {userProfile.contact.discord}</p>
            <p><strong>Line:</strong> {userProfile.contact.line}</p>
          </div>

          <div className="bio-section">
            <h2>Bio/Experience</h2>
            <p>{userProfile.bio}</p>
          </div>
        </div>

        {/* Right - Posts */}
        <div className="profile-right-panel">
          <div className="posts-header">
            <h2>Past Posts</h2>
          </div>
          
          <div className="posts-list">
            {userProfile.pastPosts.map((post) => (
              <div key={post.id} className="post-card">
                <div className="post-icon"><FaUserCircle /></div>
                <div className="post-details">
                  <h3>{post.title}</h3>
                  <p>{post.description}</p>
                  <p className="post-date">{post.date}</p>
                </div>
                <div className="post-actions">
                  <button className="edit-btn">Edit</button>
                  <button className="delete-btn">Delete</button>
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