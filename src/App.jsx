import { useState } from 'react';
import './App.css';

// component imports
import FeedSelector from './components/FeedSelector';
import TutorFeed from './components/TutorFeed';
import QAFeed from './components/QAFeed';

function App() {
  // สร้าง State เพื่อจัดการว่าตอนนี้อยู่หน้า Feed ไหน ('tutor' หรือ 'qa')
  const [activeFeed, setActiveFeed] = useState('tutor')

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

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>CS StudyRoom</h1>

      {/* selector for feed tabs */}
      <FeedSelector activeFeed={activeFeed} setActiveFeed={setActiveFeed} />

      {/* render the chosen feed */}
      <div>
        {activeFeed === 'tutor' ? (
          <TutorFeed posts={tutorPosts} />
        ) : (
          <QAFeed posts={qaPosts} />
        )}
      </div>
    </div>
  )
}

export default App
