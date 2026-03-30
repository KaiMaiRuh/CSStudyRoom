import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import './Calendar.css';

const Calendar = ({ tutorPosts = [], onBack }) => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter posts where user has joined or posted
  const sessionsByType = useMemo(() => {
    if (!user?.uid || !Array.isArray(tutorPosts)) return { ownPosts: [], joinedSessions: [] };

    const ownPosts = [];
    const joinedSessions = [];

    tutorPosts.forEach(post => {
      const isOwner = post?.authorId === user.uid || post?.user?.uid === user.uid;
      
      if (isOwner) {
        ownPosts.push({ ...post, isOwn: true });
      } else {
        const joiners = Array.isArray(post.joiners) ? post.joiners : [];
        if (joiners.some(joiner => joiner?.uid === user.uid || joiner?.id === user.uid)) {
          joinedSessions.push({ ...post, isOwn: false });
        }
      }
    });

    return { ownPosts, joinedSessions };
  }, [tutorPosts, user?.uid]);

  const allSessions = useMemo(() => {
    return [...sessionsByType.ownPosts, ...sessionsByType.joinedSessions];
  }, [sessionsByType]);

  // Group sessions by date
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    allSessions.forEach(session => {
      const date = session.date || '';
      if (date) {
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(session);
      }
    });
    return grouped;
  }, [allSessions]);

  // Get calendar data for current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        dateStr,
        sessions: sessionsByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentMonth, sessionsByDate]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return new Date(year, parseInt(month) - 1, day);
  };

  const monthString = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Truncate title but keep "By username"
  const truncateSessionTitle = (title, maxLength = 15) => {
    if (title.length > maxLength) {
      return title.substring(0, maxLength) + '...';
    }
    return title;
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="calendar-nav-button" onClick={handlePrevMonth}>‹</button>
        <h2 className="calendar-title">{monthString}</h2>
        <button className="calendar-nav-button" onClick={handleNextMonth}>›</button>
      </div>

      <div className="calendar-weekdays">
        <div className="weekday">Sun</div>
        <div className="weekday">Mon</div>
        <div className="weekday">Tue</div>
        <div className="weekday">Wed</div>
        <div className="weekday">Thu</div>
        <div className="weekday">Fri</div>
        <div className="weekday">Sat</div>
      </div>

      <div className="calendar-grid">
        {calendarDays.map((dayObj, idx) => (
          <div key={idx} className={`calendar-day ${dayObj ? 'has-day' : 'empty'}`}>
            {dayObj && (
              <>
                <div className="day-number">{dayObj.day}</div>
                <div className="sessions-container">
                  {dayObj.sessions.map((session, sessionIdx) => {
                    const authorName = session.user?.username || session.user?.name || session.authorUsername || 'Unknown';
                    const sessionTitle = session.title || '';
                    const truncatedTitle = truncateSessionTitle(sessionTitle);
                    const badgeClass = session.isOwn ? 'session-badge-own' : 'session-badge-joined';
                    return (
                      <div key={sessionIdx} className={`session-badge ${badgeClass}`}>
                        {truncatedTitle} By {authorName}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {allSessions.length === 0 && (
        <div className="no-sessions">
          <p>No tutoring sessions yet</p>
        </div>
      )}
    </div>
  );
};

export default Calendar;
