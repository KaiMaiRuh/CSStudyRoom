import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';
import useFeedData from '../../hooks/useFeedData.js';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function toISODateInputValue(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toDayKey(d) {
  return toISODateInputValue(startOfDay(d));
}

function formatDayLabel(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function safeParseDateInput(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRangeLabel(start, end) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

function clampNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function parseTimestampLike(raw) {
  if (raw?.toDate && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseCreatedAtFromData(data) {
  const raw = data?.createdAt;
  if (raw?.toDate && typeof raw.toDate === 'function') {
    const d = raw.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string' && raw.trim()) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dateStr = typeof data?.date === 'string' ? data.date.trim() : '';
  const timeStr = typeof data?.time === 'string' ? data.time.trim() : '';
  if (dateStr) {
    const iso = `${dateStr}T${timeStr || '00:00'}:00`;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

function niceCeilMax(maxValue) {
  const x = Math.max(0, clampNumber(maxValue));
  if (x <= 1) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)));
  const n = x / magnitude;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * magnitude;
}

function extractFirstUrl(text) {
  if (!text) return '';
  const m = String(text).match(/https?:\/\/[^\s)]+/i);
  return m ? m[0] : '';
}

function MultiLineChart({ labels, series }) {
  const width = 640;
  const height = 260; // add bottom margin for axis labels
  const margin = { left: 44, right: 44, top: 18, bottom: 42 };

  const allValues = series.flatMap((s) => (Array.isArray(s.values) ? s.values : []));
  const rawMax = Math.max(1, ...allValues.map(clampNumber));
  const max = niceCeilMax(rawMax);
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const bottomAxisY = margin.top + innerH;

  const buildPoints = (values) =>
    values.map((v, i) => {
      const x = margin.left + (labels.length <= 1 ? 0 : (i * innerW) / (labels.length - 1));
      const y = margin.top + (1 - clampNumber(v) / max) * innerH;
      return { x, y };
    });

  const tickCount = 5;
  const ticks = new Array(tickCount).fill(0).map((_, i) => (max * (tickCount - 1 - i)) / (tickCount - 1));

  return (
    <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trending subjects chart">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="#fdf8e4" />

      {/* Y grid + labels */}
      {ticks.map((t, idx) => {
        const y = margin.top + (1 - t / max) * innerH;
        return (
          <g key={idx}>
            <line
              x1={margin.left}
              y1={y}
              x2={width - margin.right}
              y2={y}
              stroke="#1a2b48"
              strokeOpacity="0.10"
            />
            <text
              x={margin.left - 10}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#1a2b48"
              opacity="0.75"
            >
              {Math.round(t).toString()}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={margin.left} y1={bottomAxisY} x2={width - margin.right} y2={bottomAxisY} stroke="#1a2b48" strokeOpacity="0.35" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={bottomAxisY} stroke="#1a2b48" strokeOpacity="0.35" />

      {series.map((s) => {
        const pts = buildPoints(s.values);
        const path = pts.map((p) => `${p.x},${p.y}`).join(' ');
        return (
          <g key={s.name}>
            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={path}
            />
          </g>
        );
      })}

      {labels.map((label, idx) => {
        const x = margin.left + (labels.length <= 1 ? 0 : (idx * innerW) / (labels.length - 1));
        const step = Math.max(1, Math.ceil(labels.length / 7));
        const shouldShow = labels.length <= 7 || idx % step === 0 || idx === labels.length - 1;
        return (
          <text key={`${label}-${idx}`} x={x} y={bottomAxisY + 12} textAnchor="middle" fontSize="10" fill="#1a2b48" opacity="0.75">
            {shouldShow ? label : ''}
          </text>
        );
      })}

      {/* Units: place outside the plotted area (bottom margin / top-left) */}
      <text x={margin.left + 4} y={margin.top - 6} textAnchor="start" fontSize="10" fill="#1a2b48" opacity="0.75">
        Posts
      </text>
      <text x={width - margin.right} y={bottomAxisY + 32} textAnchor="end" fontSize="10" fill="#1a2b48" opacity="0.75">
        Date
      </text>
    </svg>
  );
}


function HourBarChart({ labels, values }) {
  const width = 640;
  const height = 260;
  const margin = { left: 44, right: 44, top: 18, bottom: 42 };

  const rawMax = Math.max(1, ...values.map(clampNumber));
  const max = niceCeilMax(rawMax);
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const bottomAxisY = margin.top + innerH;

  const barCount = Math.max(1, labels.length);
  const gap = 10;
  const barW = Math.max(10, (innerW - gap * (barCount - 1)) / barCount);

  const tickCount = 5;
  const ticks = new Array(tickCount).fill(0).map((_, i) => (max * (tickCount - 1 - i)) / (tickCount - 1));

  return (
    <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Peak hours chart">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="#fdf8e4" />

      {/* Y grid + labels */}
      {ticks.map((t, idx) => {
        const y = margin.top + (1 - t / max) * innerH;
        return (
          <g key={idx}>
            <line
              x1={margin.left}
              y1={y}
              x2={width - margin.right}
              y2={y}
              stroke="#1a2b48"
              strokeOpacity="0.10"
            />
            <line
              x1={margin.left - 6}
              y1={y}
              x2={margin.left}
              y2={y}
              stroke="#1a2b48"
              strokeOpacity="0.35"
            />
            <text
              x={margin.left - 10}
              y={y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#1a2b48"
              opacity="0.75"
            >
              {Math.round(t).toString()}
            </text>
          </g>
        );
      })}

      <line x1={margin.left} y1={bottomAxisY} x2={width - margin.right} y2={bottomAxisY} stroke="#1a2b48" strokeOpacity="0.35" />
      <line x1={margin.left} y1={margin.top} x2={margin.left} y2={bottomAxisY} stroke="#1a2b48" strokeOpacity="0.35" />

      {values.map((v, i) => {
        const x = margin.left + i * (barW + gap);
        const h = (v / max) * innerH;
        const y = bottomAxisY - h;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx="4" fill="#646cff" />;
      })}

      {labels.map((label, idx) => {
        const x = margin.left + idx * (barW + gap) + barW / 2;
        const shouldShow = labels.length <= 12 ? true : idx % 2 === 0;
        return (
          <text key={label} x={x} y={bottomAxisY + 12} textAnchor="middle" fontSize="10" fill="#1a2b48" opacity="0.75">
            {shouldShow ? label : ''}
          </text>
        );
      })}

      {/* Units: place outside the plotted area */}
      <text x={margin.left + 4} y={margin.top - 6} textAnchor="start" fontSize="10" fill="#1a2b48" opacity="0.75">
        Events
      </text>
      <text x={width - margin.right} y={bottomAxisY + 32} textAnchor="end" fontSize="10" fill="#1a2b48" opacity="0.75">
        Hours
      </text>
    </svg>
  );
}

const AdminDashboard = () => {
  const { tutorPosts, qaPosts } = useFeedData();
  const [usersById, setUsersById] = useState({});
  const [rangeStartStr, setRangeStartStr] = useState(() => {
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return toISODateInputValue(start);
  });
  const [rangeEndStr, setRangeEndStr] = useState(() => toISODateInputValue(startOfDay(new Date())));

  const [analyticsPosts, setAnalyticsPosts] = useState([]);
  const [peakHours, setPeakHours] = useState(() => ({
    labels: [],
    values: [],
    loading: isFirebaseConfigured(),
    capped: false,
    visitDocs: 0,
    pageViews: 0,
    missingHourlyDocs: 0,
    error: '',
  }));

  // Palette from existing app colors (do not introduce new colors)
  const subjectColors = useMemo(() => {
    // All of these already exist in project CSS.
    return [
      '#1a2b48',
      '#fcc419',
      '#e74c3c',
      '#535bf2',
      '#6b8793',
      '#646cff',
      '#747bff',
      '#0d1a30',
      '#e6b800',
      '#e5b816',
      '#cc0000',
      '#213547',
      '#8b8b8b',
    ];
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    const { db } = getFirebaseServices();
    const ref = collection(db, 'users');

    return onSnapshot(
      ref,
      (snap) => {
        const next = {};
        snap.docs.forEach((d) => {
          next[d.id] = d.data() || {};
        });
        setUsersById(next);
      },
      (err) => {
        console.error('Failed to subscribe users for admin dashboard', err);
      }
    );
  }, []);

  const range = useMemo(() => {
    const startParsed = safeParseDateInput(rangeStartStr);
    const endParsed = safeParseDateInput(rangeEndStr);

    if (!startParsed || !endParsed) {
      const end = startOfDay(new Date());
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return { start, end };
    }

    const start = startOfDay(startParsed);
    const end = startOfDay(endParsed);
    if (start.getTime() <= end.getTime()) return { start, end };
    return { start, end: start };
  }, [rangeStartStr, rangeEndStr]);

  const handleRangeStartChange = (value) => {
    setRangeStartStr(value);

    const nextStart = safeParseDateInput(value);
    const currentEnd = safeParseDateInput(rangeEndStr);
    if (!nextStart || !currentEnd) return;

    if (nextStart.getTime() > currentEnd.getTime()) {
      setRangeEndStr(value);
    }
  };

  const handleRangeEndChange = (value) => {
    const nextEnd = safeParseDateInput(value);
    const currentStart = safeParseDateInput(rangeStartStr);

    if (nextEnd && currentStart && nextEnd.getTime() < currentStart.getTime()) {
      setRangeEndStr(rangeStartStr);
      return;
    }

    setRangeEndStr(value);
  };

  // Subscribe posts for analytics (filter client-side by range).
  // This is more robust than Firestore range queries when legacy data has mixed createdAt types.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const tutorQ = query(collection(db, 'tutorPosts'), orderBy('createdAt', 'desc'));
    const qaQ = query(collection(db, 'qaPosts'), orderBy('createdAt', 'desc'));

    let tutorUnsub = null;
    let qaUnsub = null;
    let tutorDocs = [];
    let qaDocs = [];

    const recompute = () => setAnalyticsPosts([...tutorDocs, ...qaDocs]);

    tutorUnsub = onSnapshot(
      tutorQ,
      (snap) => {
        tutorDocs = snap.docs.map((d) => ({
          id: d.id,
          type: 'tutor',
          authorId: d.data()?.authorId || null,
          subject: d.data()?.subject || '',
          createdAt: parseCreatedAtFromData(d.data()),
        }));
        recompute();
      },
      (err) => console.error('Failed to subscribe tutorPosts for admin dashboard', err)
    );

    qaUnsub = onSnapshot(
      qaQ,
      (snap) => {
        qaDocs = snap.docs.map((d) => ({
          id: d.id,
          type: 'qa',
          authorId: d.data()?.authorId || null,
          subject: d.data()?.subject || '',
          createdAt: parseCreatedAtFromData(d.data()),
        }));
        recompute();
      },
      (err) => console.error('Failed to subscribe qaPosts for admin dashboard', err)
    );

    return () => {
      if (typeof tutorUnsub === 'function') tutorUnsub();
      if (typeof qaUnsub === 'function') qaUnsub();
    };
  }, []);

  const trending = useMemo(() => {
    const start = range.start;
    const end = endOfDay(range.end);
    const posts = analyticsPosts.filter((p) => p.createdAt && p.subject && p.createdAt >= start && p.createdAt <= end);

    // Build date axis (inclusive)
    const days = [];
    for (let d = startOfDay(start); d <= startOfDay(end); ) {
      days.push(new Date(d));
      d = new Date(d);
      d.setDate(d.getDate() + 1);
    }

    const dayKeys = days.map(toDayKey);
    const labels = days.map(formatDayLabel);
    const indexByDayKey = new Map(dayKeys.map((k, i) => [k, i]));

    // Totals per subject in range
    const totals = new Map();
    posts.forEach((p) => {
      const s = String(p.subject || '').trim();
      if (!s) return;
      totals.set(s, (totals.get(s) || 0) + 1);
    });

    const topSubjects = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([subject]) => subject);

    const valuesBySubject = new Map();
    topSubjects.forEach((s) => valuesBySubject.set(s, new Array(labels.length).fill(0)));

    posts.forEach((p) => {
      const s = String(p.subject || '').trim();
      if (!valuesBySubject.has(s)) return;
      const key = toDayKey(p.createdAt);
      const idx = indexByDayKey.get(key);
      if (idx == null) return;
      valuesBySubject.get(s)[idx] += 1;
    });

    const series = topSubjects.map((subject, idx) => ({
      name: subject,
      color: subjectColors[idx % subjectColors.length],
      values: valuesBySubject.get(subject) || new Array(labels.length).fill(0),
    }));

    return { labels, series, totalSubjects: topSubjects.length };
  }, [analyticsPosts, subjectColors, range.start, range.end]);

  const mostActive = useMemo(() => {
    const all = [...(tutorPosts || []), ...(qaPosts || [])];
    const counts = new Map();
    const tutorCount = new Map();
    const qaCount = new Map();

    all.forEach((p) => {
      const uid = p?.authorId;
      if (!uid) return;
      counts.set(uid, (counts.get(uid) || 0) + 1);
      if (p?.type === 'tutor') {
        tutorCount.set(uid, (tutorCount.get(uid) || 0) + 1);
      } else {
        qaCount.set(uid, (qaCount.get(uid) || 0) + 1);
      }
    });

    const rows = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([uid], idx) => {
        const u = usersById[uid] || {};
        const name = u.displayName || u.username || u.email || 'Unknown';
        const email = u.email || '';
        const year = u.year || u.education?.year || '';

        const explicitRole = u.role ? String(u.role) : '';
        let role = explicitRole;
        if (!role) {
          const t = tutorCount.get(uid) || 0;
          const q = qaCount.get(uid) || 0;
          if (t > 0) role = 'tutor';
          else if (q > 0) role = 'Q&A contributor';
          else role = 'student';
        }

        return { no: idx + 1, uid, name, email, year, role };
      });

    return rows;
  }, [tutorPosts, qaPosts, usersById]);

  // Peak hours from compact per-day visit docs (users/{uid}/visits/{YYYY-MM-DD})
  // Written by AuthContext.logActivity using hours.h00..hours.h23 counters.
  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    let cancelled = false;
    const run = async () => {
      try {
        const { db } = getFirebaseServices();
        const start = range.start;
        const end = endOfDay(range.end);

        let snap;
        try {
          const qy = query(
            collectionGroup(db, 'visits'),
            where('date', '>=', start),
            where('date', '<=', end),
            orderBy('date', 'asc'),
            limit(5000)
          );
          snap = await getDocs(qy);
        } catch {
          // Fallback: same query without orderBy (should still be supported by single-field indexes)
          const fallbackQ = query(
            collectionGroup(db, 'visits'),
            where('date', '>=', start),
            where('date', '<=', end),
            limit(5000)
          );
          snap = await getDocs(fallbackQ);
        }

        const buckets = new Array(24).fill(0);
        let visitDocs = 0;
        let pageViews = 0;
        let missingHourlyDocs = 0;

        snap.docs.forEach((d) => {
          visitDocs += 1;
          const data = d.data() || {};
          const hours = data?.hours;
          if (!hours || typeof hours !== 'object') {
            missingHourlyDocs += 1;

            // Legacy fallback: if we don't have per-hour breakdown, approximate by
            // assigning the day's total to the hour of lastSeen/lastSignIn/date.
            const fallbackCount = clampNumber(data.pageViewCount ?? data.count);
            const dt =
              parseTimestampLike(data.lastSeen)
              || parseTimestampLike(data.lastSignIn)
              || parseTimestampLike(data.date);
            if (fallbackCount && dt) {
              buckets[dt.getHours()] += fallbackCount;
              pageViews += fallbackCount;
            }
            return;
          }

          for (let h = 0; h < 24; h += 1) {
            const key = `h${String(h).padStart(2, '0')}`;
            const v = clampNumber(hours[key]);
            if (!v) continue;
            buckets[h] += v;
            pageViews += v;
          }
        });

        const labels = new Array(24).fill(0).map((_, h) => String(h).padStart(2, '0'));
        const capped = snap.size >= 5000;

        if (!cancelled) setPeakHours({ labels, values: buckets, loading: false, capped, visitDocs, pageViews, missingHourlyDocs, error: '' });
      } catch (err) {
        console.error('Failed to load peak hours', err);
        const message = err?.message || 'Failed to load visits data';
        if (!cancelled) setPeakHours({ labels: [], values: [], loading: false, capped: false, visitDocs: 0, pageViews: 0, missingHourlyDocs: 0, error: message });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [range.start, range.end]);

  const rangeLabel = useMemo(() => formatRangeLabel(range.start, range.end), [range.start, range.end]);
  const trendingTitle = 'Top Trending Subjects';

  return (
    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">{trendingTitle}</h2>
          <div className="admin-range admin-range-picker" aria-label="Select date range">
            <input
              className="admin-range-input"
              type="date"
              value={rangeStartStr}
              onChange={(e) => handleRangeStartChange(e.target.value)}
              max={rangeEndStr || undefined}
              aria-label="Start date"
            />
            <span className="admin-range-sep" aria-hidden="true">
              -
            </span>
            <input
              className="admin-range-input"
              type="date"
              value={rangeEndStr}
              onChange={(e) => handleRangeEndChange(e.target.value)}
              min={rangeStartStr || undefined}
              aria-label="End date"
            />
          </div>
        </div>
        <MultiLineChart labels={trending.labels || []} series={trending.series} />
        <div className="admin-legend" aria-label="Legend">
          {trending.series.length ? (
            trending.series.map((s) => (
              <div key={s.name} className="admin-legend-item">
                <span className="admin-legend-swatch" style={{ backgroundColor: s.color }} aria-hidden="true" />
                <span className="admin-legend-label">{s.name}</span>
              </div>
            ))
          ) : (
            <div className="admin-legend-empty">No data in selected range</div>
          )}
        </div>
        <div className="admin-range-hint">{rangeLabel}</div>
      </section>

      <section className="admin-card admin-table-card">
        <h2 className="admin-card-title">Most active student</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 70 }}>No.</th>
                <th>Name</th>
                <th>Email</th>
                <th style={{ width: 90 }}>Year</th>
                <th style={{ width: 140 }}>Role</th>
              </tr>
            </thead>
            <tbody>
              {mostActive.length ? (
                mostActive.map((r) => (
                  <tr key={r.uid}>
                    <td>{r.no}</td>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{r.year}</td>
                    <td>{r.role}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="admin-empty">No data</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-card-title">Peak Hours</h2>
        {peakHours.loading ? (
          <div className="admin-empty">Loading…</div>
        ) : peakHours.labels.length ? (
          <>
            <HourBarChart labels={peakHours.labels} values={peakHours.values.map(clampNumber)} />
            <div className="admin-range-hint">
              {`Events: ${peakHours.pageViews} • visit docs: ${peakHours.visitDocs}`}
              {peakHours.missingHourlyDocs ? ` • legacy docs (no hourly breakdown): ${peakHours.missingHourlyDocs}` : ''}
              {peakHours.capped ? ' • Showing first 5000 docs' : ''}
            </div>
          </>
        ) : (
          <div className="admin-empty">
            {peakHours.error ? (
              (() => {
                const raw = String(peakHours.error || '');
                const url = extractFirstUrl(raw);
                const needsSingleField =
                  raw.includes('COLLECTION_GROUP_ASC')
                  && raw.toLowerCase().includes('collection')
                  && raw.toLowerCase().includes('date');

                return (
                  <div className="admin-error">
                    <div className="admin-error-title">Peak Hours can’t load yet</div>
                    <div className="admin-error-body">
                      {needsSingleField
                        ? 'Firestore is missing the collection group single-field index for visits.date (ASC). Create/enable that index, wait until it finishes building, then reload the dashboard.'
                        : `Peak Hours error: ${raw}`}
                    </div>
                    {url ? (
                      <div className="admin-error-link">
                        <a href={url} target="_blank" rel="noreferrer">
                          Create index in Firebase console
                        </a>
                      </div>
                    ) : null}
                  </div>
                );
              })()
            ) : (
              'No visit data'
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
