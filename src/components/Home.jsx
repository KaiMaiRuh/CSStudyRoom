// src/components/Home.jsx
import React, { useState } from 'react';
import './Home.css';
import TutorFeed from './TutorFeed';
import QAFeed from './QAFeed';

const Home = () => {
  const [activeTab, setActiveTab] = useState('tutor');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
  };

  return (
    <div className="home-container">
      <div className="header">
        <h1 className="main-title">CS Study Room</h1>
        
        <div className="toggle-container">
          <button 
            className={`toggle-button ${activeTab === 'tutor' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutor')}
          >
            โพสต์นัดติว
          </button>
          <button 
            className={`toggle-button ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            โพสต์ถาม-ตอบ
          </button>
        </div>
        
        <div className="divider"></div>
        
        <div className="toolbar">
          <form className="search-form" onSubmit={handleSearch}>
            <input 
              type="text" 
              placeholder="Search posts..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </form>
          
          <select 
            className="category-dropdown"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">หมวดหมู่วิชา</option>
            <option value="computer-science">Computer Science</option>
            <option value="mathematics">Mathematics</option>
            <option value="physics">Physics</option>
            <option value="chemistry">Chemistry</option>
          </select>
        </div>
      </div>
      
      <div className="feed-container">
        {activeTab === 'tutor' ? <TutorFeed /> : <QAFeed />}
      </div>
    </div>
  );
};

export default Home;