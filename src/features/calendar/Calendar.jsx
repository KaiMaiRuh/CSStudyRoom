import React, { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaMapMarkerAlt, FaTrashAlt, FaUserCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useAuth } from '../../auth/AuthContext.jsx';
import './Calendar.css';

const MAX_POSTS_PER_DAY = 2;

const pad = (value) => String(value).padStart(2, '0');

const toDateKey = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const parseDateString = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const buildCalendarDetailTarget = (post, selectedDateKey, normalizedFeed) => {
  if (!post?.id) return '';

  const basePath = post.type === 'qa' ? `/qa/${post.id}` : `/tutor/${post.id}`;
  const params = new URLSearchParams();
  params.set('origin', 'calendar');
  if (selectedDateKey) params.set('calendarDate', selectedDateKey);
  if (normalizedFeed === 'qa' || normalizedFeed === 'tutor') params.set('calendarFeed', normalizedFeed);

  return `${basePath}?${params.toString()}`;
};

const clearCalendarDateFromHash = () => {
  try {
    const rawHash = window.location.hash || '#/calendar';
    const normalizedHash = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
    const [pathPart = '/calendar', queryPart = ''] = normalizedHash.split('?');
    const params = new URLSearchParams(queryPart);

    if (!params.has('date')) return;

    params.delete('date');
    const nextQuery = params.toString();
    const nextHash = `#${pathPart}${nextQuery ? `?${nextQuery}` : ''}`;
    window.history.replaceState(window.history.state, '', nextHash);
  } catch {
    // ignore
  }
};

const parseDateTime = (dateValue, timeValue) => {
  if (typeof dateValue !== 'string' || !dateValue.trim()) return null;
  const safeTime = typeof timeValue === 'string' && timeValue.trim() ? timeValue.trim() : '00:00';
  const d = new Date(`${dateValue.trim()}T${safeTime}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const parseCreatedAt = (createdAt) => {
  if (createdAt?.toDate && typeof createdAt.toDate === 'function') {
    const d = createdAt.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) return createdAt;
  return null;
};

const getAuthorLabel = (post) => {
  const displayName = post?.user?.displayName || post?.user?.name || post?.authorName || null;
  if (displayName) return displayName;
  const username = post?.user?.username || post?.authorUsername || null;
  if (username) return `@${username}`;
  return 'Unknown';
};

const formatPostedAgo = (minutesAgo) => {
  if (minutesAgo == null || Number.isNaN(Number(minutesAgo))) return '';
  const mins = Number(minutesAgo);
  if (mins < 60) return `posted ${mins} mins ago`;
  if (mins < 1440) {
    const hrs = Math.floor(mins / 60);
    return `posted ${hrs} ${hrs === 1 ? 'hr' : 'hrs'} ago`;
  }
  const days = Math.floor(mins / 1440);
  return `posted ${days} ${days === 1 ? 'day' : 'days'} ago`;
};

const getTutorPostOwnerUid = (post) => post?.user?.uid || post?.authorId || null;

const getUniqueTutorJoinerIds = (post) => {
  const ownerUid = getTutorPostOwnerUid(post);
  const joiners = Array.isArray(post?.joiners) ? post.joiners : [];
  const uniqueJoinerIds = new Set();

  joiners.forEach((joiner) => {
    const joinerUid = typeof joiner === 'string' ? joiner : (joiner?.uid || joiner?.id || '');
    if (!joinerUid || joinerUid === ownerUid) return;
    uniqueJoinerIds.add(joinerUid);
  });

  return uniqueJoinerIds;
};

const hasUserJoinedTutorPost = (post, userUid) => {
  if (!userUid) return false;
  return getUniqueTutorJoinerIds(post).has(userUid);
};

const isTutorPostFull = (post) => {
  const capacity = Number(post?.capacity ?? 0);
  if (!Number.isFinite(capacity) || capacity <= 0) return false;
  const joinedTotalCount = getUniqueTutorJoinerIds(post).size + 1;
  return joinedTotalCount >= capacity;
};

const getTutorCalendarStatus = (post, userUid) => {
  const ownerUid = getTutorPostOwnerUid(post);

  if (userUid && ownerUid && userUid === ownerUid) {
    return 'owner';
  }

  if (isTutorPostFull(post)) {
    return 'full';
  }

  if (hasUserJoinedTutorPost(post, userUid)) {
    return 'joined';
  }

  return 'unjoined';
};

const Calendar = ({ tutorPosts = [], qaPosts = [], feedType = 'tutor', routeSelectedDateKey = null, isAdminView = false, onDeletePost, onChangeFeedType }) => {
  const { isAdmin, user } = useAuth();
  const initialSelectedDate = parseDateString(routeSelectedDateKey);
  const [currentMonth, setCurrentMonth] = useState(initialSelectedDate || new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(routeSelectedDateKey || null);
  const canUseAdminCalendar = Boolean(isAdminView && isAdmin);

  const normalizedFeed = feedType === 'qa' ? 'qa' : 'tutor';

  const sourcePosts = useMemo(() => {
    return normalizedFeed === 'qa' ? (Array.isArray(qaPosts) ? qaPosts : []) : (Array.isArray(tutorPosts) ? tutorPosts : []);
  }, [normalizedFeed, qaPosts, tutorPosts]);

  const visiblePosts = useMemo(() => {
    return sourcePosts.map((post) => ({ ...post, type: normalizedFeed }));
  }, [normalizedFeed, sourcePosts]);

  const postsByDate = useMemo(() => {
    const grouped = {};

    visiblePosts.forEach((post) => {
      const createdAtDate = parseCreatedAt(post?.createdAt);
      const dateValue = parseDateString(post?.date) || createdAtDate;
      const dateKey = toDateKey(dateValue);
      if (!dateKey) return;

      const sortDate = parseDateTime(post?.date, post?.time) || createdAtDate || dateValue;
      if (!sortDate) return;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        ...post,
        calendarDateKey: dateKey,
        calendarSortTs: sortDate.getTime(),
      });
    });

    Object.keys(grouped).forEach((dateKey) => {
      grouped[dateKey].sort((a, b) => b.calendarSortTs - a.calendarSortTs);
    });

    return grouped;
  }, [visiblePosts]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        dateStr,
        sessions: postsByDate[dateStr] || [],
      });
    }

    return days;
  }, [currentMonth, postsByDate]);

  const selectedDayPosts = useMemo(() => {
    if (!selectedDateKey) return [];
    return Array.isArray(postsByDate[selectedDateKey]) ? postsByDate[selectedDateKey] : [];
  }, [postsByDate, selectedDateKey]);

  const selectedDateLabel = useMemo(() => {
    if (!selectedDateKey) return '';
    const d = parseDateString(selectedDateKey);
    if (!d) return selectedDateKey;
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [selectedDateKey]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleChangeFeedType = (newFeedType) => {
    onChangeFeedType?.(newFeedType);
  };

  const monthString = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const truncateSessionTitle = (title, maxLength = 32) => {
    const text = String(title || 'Untitled');
    if (text.length > maxLength) {
      return `${text.substring(0, maxLength)}...`;
    }
    return text;
  };

  useEffect(() => {
    if (!routeSelectedDateKey) return;

    setSelectedDateKey(routeSelectedDateKey);

    const routeDate = parseDateString(routeSelectedDateKey);
    if (routeDate) {
      setCurrentMonth(routeDate);
    }

    clearCalendarDateFromHash();
  }, [routeSelectedDateKey]);

  const openPostDetail = (post) => {
    if (!post?.id) return;
    const target = buildCalendarDetailTarget(post, selectedDateKey, normalizedFeed);
    if (!target) return;
    try {
      window.location.assign(`#${target}`);
    } catch {
      // ignore
    }
  };

  if (selectedDateKey) {
    return (
      <div className="calendar-day-detail-page">
        <div className="calendar-day-detail-header">
          <button
            type="button"
            className="calendar-day-back"
            onClick={() => setSelectedDateKey(null)}
            aria-label="Back to calendar"
          >
            <FaArrowLeft />
          </button>
          <h2 className="calendar-day-detail-title">{selectedDateLabel}</h2>
        </div>

        {selectedDayPosts.length === 0 ? (
          <div className="calendar-day-empty">No posts on this day.</div>
        ) : (
          <div className="calendar-day-post-list">
            {selectedDayPosts.map((post) => {
              const author = getAuthorLabel(post);
              const title = post.type === 'qa'
                ? (post.question || post.subject || 'Q&A post')
                : (post.title || post.subject || 'Tutor post');
              const desc = post.description || '';
              const dateLabel = post.date || selectedDateKey;
              const dateTimeLabel = post.type === 'tutor' && post.time ? `${dateLabel} ${post.time}` : dateLabel;
              const postedLabel = formatPostedAgo(post.minutesAgo);
              const subject = post.subject || '';
              const tutorStatus = post.type === 'tutor' ? getTutorCalendarStatus(post, user?.uid) : null;
              const postCardClassName = [
                'calendar-day-post-card',
                tutorStatus ? `calendar-day-post-card-tutor-${tutorStatus}` : '',
              ].filter(Boolean).join(' ');

              return (
                <div key={post.id} className={postCardClassName}>
                    {canUseAdminCalendar ? (
                    <button
                      type="button"
                      className="calendar-delete-button"
                      aria-label="Delete post"
                      onClick={() => onDeletePost?.(post)}
                    >
                      <FaTrashAlt />
                    </button>
                  ) : null}

                  <div className="calendar-day-post-avatar" aria-hidden="true">
                    {post.user?.avatar ? (
                      <img src={post.user.avatar} alt="" className="calendar-avatar-img" />
                    ) : (
                      <FaUserCircle />
                    )}
                  </div>

                  <div className="calendar-day-post-content">
                    <h3 className="calendar-day-post-title">{title}</h3>
                    {desc ? <p className="calendar-day-post-desc">{desc}</p> : null}
                    <div className="calendar-day-post-datetime">{dateTimeLabel}</div>
                    {postedLabel ? <div className="calendar-day-post-posted">{postedLabel}</div> : null}

                    <div className="calendar-day-post-meta-row">
                      {subject ? <span className="calendar-day-post-subject">{subject}</span> : null}
                      <span className="calendar-day-post-author">by {author}</span>
                    </div>

                    {post.type === 'tutor' && post.location ? (
                      <div className="calendar-day-post-location">
                        <FaMapMarkerAlt />
                        <span>{post.location}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="calendar-day-post-actions">
                    <button
                      type="button"
                      className="calendar-read-more"
                      onClick={() => openPostDetail(post)}
                    >
                      Read more
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <button className="calendar-nav-button" onClick={handlePrevMonth}>‹</button>
        <div className="calendar-title-wrap">
          <h2 className="calendar-title">{monthString}</h2>
          <p className="calendar-feed-label">
            {normalizedFeed === 'qa' ? 'Q&A Calendar' : 'Tutor Calendar'}
          </p>
        </div>
        <button className="calendar-nav-button" onClick={handleNextMonth}>›</button>
      </div>

      <div className="calendar-feed-switcher">
        <button 
          className={`feed-switch-button ${normalizedFeed === 'tutor' ? 'active' : ''}`}
          onClick={() => handleChangeFeedType('tutor')}
          title="Switch to Tutor Calendar"
        >
           Tutor Calendar
        </button>
        <div className="feed-switch-divider"></div>
        <button 
          className={`feed-switch-button ${normalizedFeed === 'qa' ? 'active' : ''}`}
          onClick={() => handleChangeFeedType('qa')}
          title="Switch to Q&A Calendar"
        >
          Q&A Calendar 
        </button>
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
          <div
            key={idx}
            className={`calendar-day ${dayObj ? 'has-day' : 'empty'} ${dayObj?.sessions?.length ? 'has-posts' : 'no-posts'}`}
            onClick={() => {
              if (!dayObj?.sessions?.length) return;
              setSelectedDateKey(dayObj.dateStr);
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              if (!dayObj?.sessions?.length) return;
              setSelectedDateKey(dayObj.dateStr);
            }}
            role={dayObj?.sessions?.length ? 'button' : undefined}
            tabIndex={dayObj?.sessions?.length ? 0 : undefined}
          >
            {dayObj && (
              <>
                <div className="day-number">{dayObj.day}</div>
                <div className="sessions-container">
                  {dayObj.sessions.slice(0, MAX_POSTS_PER_DAY).map((session, sessionIdx) => {
                    const authorName = getAuthorLabel(session);
                    const sessionTitle = session.type === 'qa'
                      ? (session.question || session.subject || 'Q&A post')
                      : (session.title || session.subject || 'Tutor post');
                    const truncatedTitle = truncateSessionTitle(sessionTitle);
                    const tutorStatus = session.type === 'tutor' ? getTutorCalendarStatus(session, user?.uid) : null;
                    const badgeClass = session.type === 'qa'
                      ? 'session-badge-qa'
                      : `session-badge-tutor-${tutorStatus}`;
                    return (
                      <div key={sessionIdx} className={`session-badge ${badgeClass}`}>
                        {truncatedTitle} By {authorName}
                      </div>
                    );
                  })}

                  {dayObj.sessions.length > MAX_POSTS_PER_DAY ? (
                    <div className="session-more-count">+{dayObj.sessions.length - MAX_POSTS_PER_DAY} more</div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {visiblePosts.length === 0 && (
        <div className="no-sessions">
          <p>{normalizedFeed === 'qa' ? 'No Q&A posts in calendar yet' : 'No tutoring sessions yet'}</p>
        </div>
      )}
    </div>
  );
};

export default Calendar;
