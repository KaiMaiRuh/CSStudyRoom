/* Home component */
import React, { useState, useMemo } from 'react';
import { FaSearch } from 'react-icons/fa';
import './Home.css';
import TutorFeed from './TutorFeed';
import QAFeed from './QAFeed';
import useFeedData from '../../hooks/useFeedData.js';

const Home = () => {
  const feedDataResult = useFeedData();
  const { tutorPosts = [], qaPosts = [], allSubjects = [] } = feedDataResult || {};
  
  const [activeTab, setActiveTab] = useState('tutor');
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');



  const handleSearch = (e) => {
    e.preventDefault();
    /* search is applied automatically through useMemo */
  };

  /* Filter posts based on search query and category */
  const filteredTutorPosts = useMemo(() => {
    const result = tutorPosts.filter(post => {
      const matchesCategory = !category || post.subject === category;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery || 
        post.title.toLowerCase().includes(searchLower) || 
        post.description.toLowerCase().includes(searchLower) ||
        post.subject.toLowerCase().includes(searchLower);
      
      return matchesCategory && matchesSearch;
    });
    return result;
  }, [tutorPosts, searchQuery, category]);

  const filteredQaPosts = useMemo(() => {
    return qaPosts.filter(post => {
      const matchesCategory = !category || post.subject === category;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        !searchQuery || 
        post.question.toLowerCase().includes(searchLower) ||
        post.subject.toLowerCase().includes(searchLower);
      return matchesCategory && matchesSearch;
    });
  }, [qaPosts, searchQuery, category]);

  return (
    <div className="home-container">
      <div className="header">
        <h1 className="main-title">CS Study Room</h1>
        
        <div className="toggle-container">
          <button 
            className={`toggle-button ${activeTab === 'tutor' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutor')}
          >
            Tutor Posts
          </button>
          <button 
            className={`toggle-button ${activeTab === 'qa' ? 'active' : ''}`}
            onClick={() => setActiveTab('qa')}
          >
            Q&A Posts
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
            <span className="search-icon"><FaSearch /></span>
          </form>
          
          <select 
            className="category-dropdown"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Subject Category</option>
            {allSubjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="feed-container">
        {activeTab === 'tutor' ? (
          <TutorFeed posts={filteredTutorPosts} />
        ) : (
          <QAFeed posts={filteredQaPosts} />
        )}
      </div>
    </div>
  );
};

export default Home;