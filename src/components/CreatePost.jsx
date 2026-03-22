/* CreatePost component */
import React, { useMemo, useRef, useState } from 'react';
import { FaCalendarAlt, FaClock } from 'react-icons/fa';
import './CreatePost.css';
import { imageFileToBase64DataUrl } from './imageBase64';

const CreatePost = ({ onCancel, onCreate, mode = 'create', initialPost = null, onUpdate }) => {
  const initialType = initialPost?.type || 'tutor';
  const isEdit = mode === 'edit' && Boolean(initialPost);
  const [postType, setPostType] = useState(() => (isEdit ? initialType : 'tutor')); /* post type */
  const initialForm = useMemo(
    () => ({
      subject: initialPost?.subject || '',
      location: initialPost?.location || '',
      title: initialPost?.title || '',
      description: initialPost?.description || '',
      date: initialPost?.date || '',
      time: initialPost?.time || '',
      hours: initialPost?.hours != null ? String(initialPost.hours) : '',
      capacity: initialPost?.capacity != null ? String(initialPost.capacity) : '',
      question: initialPost?.question || '',
      imageUrl: initialPost?.imageUrl || null,
    }),
    [initialPost]
  );

  const [formData, setFormData] = useState(() =>
    isEdit
      ? initialForm
      : {
          subject: '',
          location: '',
          title: '',
          description: '',
          date: '',
          time: '',
          hours: '',
          capacity: '',
          question: '',
          imageUrl: null,
        }
  );

  const [imageError, setImageError] = useState('');

  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const pendingImagePromiseRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const pending = pendingImagePromiseRef.current;
    if (pending && typeof pending.then === 'function') {
      try {
        await pending;
      } finally {
        pendingImagePromiseRef.current = null;
      }
    }

    /* send data to parent */
    if (mode === 'edit') {
      onUpdate?.(postType, formData, initialPost?.id);
    } else {
      onCreate?.(postType, formData);
    }
    /* close modal */
    if (onCancel) onCancel();
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');

    const p = (async () => {
      const dataUrl = await imageFileToBase64DataUrl(file, { targetBytes: 300 * 1024 });
      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
    })();

    pendingImagePromiseRef.current = p.catch((err) => {
      console.error('Failed to process image', err);
      setImageError(err?.message || 'Failed to process image');
      return null;
    });
  };

  return (
    <div className="create-post-modal">
      <div className="create-post-container">
        <div className="modal-header">
          <h2 className="modal-title">{mode === 'edit' ? 'Edit Post' : 'Create New Post'}</h2>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        
        <div className="post-type-selector">
          <button 
            className={`type-button ${postType === 'tutor' ? 'active' : ''}`}
            onClick={() => setPostType('tutor')}
            type="button"
            disabled={mode === 'edit'}
          >
            Tutor Post
          </button>
          <button 
            className={`type-button ${postType === 'qa' ? 'active' : ''}`}
            onClick={() => setPostType('qa')}
            type="button"
            disabled={mode === 'edit'}
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
                      /* use showPicker if available */
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); return; } catch { /* ignore */ }
                      }
                      /* fallback: focus/click */
                      el.focus();
                      try { el.click(); } catch { /* ignore */ }
                    }} onKeyPress={(e)=>{ if(e.key==='Enter'){ const el=dateRef.current; el && (el.showPicker?.() || el.focus()); } }}>
                    <input 
                      ref={dateRef}
                      type="date" 
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                    <span className="input-icon" aria-hidden>
                      <FaCalendarAlt />
                    </span>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Time</label>
                    <div className="input-with-icon time-wrapper" onClick={() => {
                      const el = timeRef.current;
                      if (!el) return;
                      if (typeof el.showPicker === 'function') {
                        try { el.showPicker(); return; } catch { /* ignore */ }
                      }
                      el.focus();
                      try { el.click(); } catch { /* ignore */ }
                    }} onKeyPress={(e)=>{ if(e.key==='Enter'){ const el=timeRef.current; el && (el.showPicker?.() || el.focus()); } }}>
                    <input 
                      ref={timeRef}
                      type="time" 
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                    />
                    <span className="input-icon" aria-hidden>
                      <FaClock />
                    </span>
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
              onChange={handleImageChange}
              accept="image/*"
            />
            {imageError ? <span className="error-message">{imageError}</span> : null}
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
            <button type="submit" className="submit-button">{mode === 'edit' ? 'Save' : 'Create Post'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;