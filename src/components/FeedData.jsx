import { useState } from 'react';

const FeedData = () => {
  // จำลองข้อมูลโพสต์หาคนติว
  const tutorPosts = [
    {
      id: 1,
      author: "Tutor1",
      topic: "หัวข้อ 1",
      detail: "ข้อมูลของหัวข้อที่ 1",
      joined: 2,
      maxSlots: 5,
    },
    {
      id: 2,
      author: "Tutor 2",
      topic: "หัวข้อ 2",
      detail: "ข้อมูลหัวข้อ 2",
      joined: 3,
      maxSlots: 4,
    },
  ];

  // จำลองข้อมูลโพสต์ถามตอบ
  const qaPosts = [
    {
      id: 1,
      author: "Questioner1",
      question: "Question 1",
      answers: 2,
    },
    {
      id: 2,
      author: "Questioner2",
      question: "Question 2",
      answers: 5,
    },
  ];

  const [activeFeed, setActiveFeed] = useState('tutor');

  return {
    tutorPosts,
    qaPosts,
    activeFeed,
    setActiveFeed
  };
};

export default FeedData;