import { useState } from 'react';

const FeedData = () => {
  const [tutorPosts, setTutorPosts] = useState([
    {
      id: 1,
      user: { name: 'John Doe', avatar: '' },
      subject: 'Algorithm',
      location: 'Engineering Building',
      title: 'Help with Dynamic Programming',
      description: 'Looking for someone to help with DP problems for final exam',
      date: '2023-05-15',
      time: '14:30',
      minutesAgo: 30,
      capacity: 3,
      current: 2,
      hours: 2
    },
    {
      id: 2,
      user: { name: 'Jane Smith', avatar: '' },
      subject: 'Database',
      location: 'Library',
      title: 'SQL Query Optimization',
      description: 'Need help with optimizing complex queries',
      date: '2023-05-14',
      time: '10:00',
      minutesAgo: 120,
      capacity: 5,
      current: 5,
      hours: 1.5
    }
  ]);

  const [qaPosts, setQaPosts] = useState([
    {
      id: 1,
      user: { name: 'Alex Johnson', avatar: '' },
      subject: 'Algorithm',
      question: 'How to implement a binary search tree?',
      date: '2023-05-15',
      time: '15:45',
      minutesAgo: 45,
      likes: 12,
      comments: 3,
      shares: 1
    },
    {
      id: 2,
      user: { name: 'Maria Garcia', avatar: '' },
      subject: 'Mathematics',
      question: 'Can someone explain the concept of limits?',
      date: '2023-05-14',
      time: '09:20',
      minutesAgo: 150,
      likes: 8,
      comments: 2,
      shares: 0
    }
  ]);

  const [activeFeed, setActiveFeed] = useState('tutor');

  const addTutorPost = (post) => {
    const id = Date.now();
    const newPost = {
      id,
      user: { name: post.author || 'You', avatar: '' },
      subject: post.subject || post.title || 'Untitled',
      location: post.location || '',
      title: post.title || post.subject || 'Untitled',
      description: post.description || '',
      date: post.date || new Date().toISOString().slice(0,10),
      time: post.time || '',
      minutesAgo: 0,
      capacity: post.capacity ? Number(post.capacity) : 1,
      current: post.current ? Number(post.current) : 1,
      hours: post.hours ? Number(post.hours) : 1
    };
    setTutorPosts(prev => [newPost, ...prev]);
  };

  const addQaPost = (post) => {
    const id = Date.now();
    const newPost = {
      id,
      user: { name: post.author || 'You', avatar: '' },
      subject: post.subject || '',
      question: post.question || post.title || 'Untitled question',
      date: post.date || new Date().toISOString().slice(0,10),
      time: post.time || '',
      minutesAgo: 0,
      likes: 0,
      comments: 0,
      shares: 0
    };
    setQaPosts(prev => [newPost, ...prev]);
  };

  return {
    tutorPosts,
    qaPosts,
    activeFeed,
    setActiveFeed,
    addTutorPost,
    addQaPost
  };
};

export default FeedData;