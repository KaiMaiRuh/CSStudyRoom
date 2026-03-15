// src/components/CreatePost.jsx
import React, { useState, useRef } from 'react';
import './CreatePost.css';

const CreatePost = ({ onCancel, onCreate }) => {
  const [postType, setPostType] = useState('tutor'); // 'tutor' or 'qa'
  const [formData, setFormData] = useState({
    subject: '',
    location: '',
    title: '',
    description: '',
    date: '',
    time: '',
    hours: '',
    capacity: '',
    question: '',
    image: null
  });

  const dateRef = useRef(null);
  const timeRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // pass form data to parent to add to feed
    if (onCreate) onCreate(postType, formData);
    // close modal
    if (onCancel) onCancel();
  };

  return (
    <div className="create-post-modal">
      <div className="create-post-container">
        <div className="modal-header">
          <h2 className="modal-title">Create New Post</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div className="post-type-selector">
          <button 
            className={`type-button ${postType === 'tutor' ? 'active' : ''}`}
            onClick={() => setPostType('tutor')}
          >
            Tutor Post
          </button>
          <button 
            className={`type-button ${postType === 'qa' ? 'active' : ''}`}
            onClick={() => setPostType('qa')}
          >
            Q&A Post
          </button>
        </div>
        
        <form className="create-post-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Subject</label>
            <input 
              type="text" 
              name="subject"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter subject"
              required
            />
          </div>
          
          {postType === 'tutor' ? (
            <>
              <div className="form-group">
                <label>Location</label>
                <input 
                  type="text" 
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter location"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Date</label>
                  <div className="input-with-icon date-wrapper" onClick={() => {
                      const el = dateRef.current;
                      if (!el) return;
                      // Prefer showPicker where available
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); return; } catch(e) {}
                      }
                      // Fallback to focus + click
                      el.focus();
                      try { el.click(); } catch(e) {}
                    }} onKeyPress={(e)=>{ if(e.key==='Enter'){ const el=dateRef.current; el && (el.showPicker?.() || el.focus()); } }}>
                    <input 
                      ref={dateRef}
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Time</label>
                  <div className="input-with-icon time-wrapper" onClick={() => {
                      const el = timeRef.current;
                      if (!el) return;
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); return; } catch(e) {}
                      }
                      el.focus();
                      try { el.click(); } catch(e) {}
                    }} onKeyPress={(e)=>{ if(e.key==='Enter'){ const el=timeRef.current; el && (el.showPicker?.() || el.focus()); } }}>
                    <input 
                      ref={timeRef}
                      type="time" 
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Hours</label>
                  <input 
                    type="number" 
                    name="hours"
                    value={formData.hours}
                    onChange={handleInputChange}
                    placeholder="Number of hours"
                    min="0.5"
                    step="0.5"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Capacity</label>
                  <input 
                    type="number" 
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    placeholder="Maximum participants"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Title</label>
                <input 
                  type="text" 
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter title"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  rows="4"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Question</label>
                <textarea 
                  name="question"
                  value={formData.question}
                  onChange={handleInputChange}
                  placeholder="Enter your question"
                  rows="3"
                  required
                />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Image (Optional)</label>
            <input 
              type="file" 
              name="image"
              onChange={(e) => setFormData(prev => ({...prev, image: e.target.files[0]}))}
              accept="image/*"
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="submit-button">Create Post</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;