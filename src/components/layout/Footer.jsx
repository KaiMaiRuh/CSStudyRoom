import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section footer-left">
          <h2>CS Study Room</h2>
          <p>A shared space for CS students to learn, ask, and grow together.</p>
        </div>

        <div className="footer-section footer-middle">
          <h3>Content</h3>
          <ul>
            <li><a href="#qa-posts">Q&A Posts</a></li>
            <li><a href="#study-session-posts">Study Session Posts</a></li>
          </ul>
        </div>

        <div className="footer-section footer-right">
          <h3>More</h3>
          <ul>
            <li><a href="#contact">Contact</a></li>
            <li><a href="#report-issue">Report an Issue</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © 2026 <span className="footer-brand-highlight">CS StudyRoom</span> — made by students, for students
        </p>
      </div>
    </footer>
  );
};

export default Footer;
