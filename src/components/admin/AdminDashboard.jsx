import React, { useEffect, useMemo, useState } from 'react';
import './AdminDashboard.css';
import FeedData from '../FeedData';
import { getFirebaseServices, isFirebaseConfigured } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatRangeLabel(start, end) {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}`;
}

function clampNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function MiniLineChart({ labels, values }) {
  const width = 640;
  const height = 210;
  const padding = { x: 44, y: 18 };

  const max = Math.max(1, ...values);
  const innerW = width - padding.x * 2;
  const innerH = height - padding.y * 2;

  const points = values.map((v, i) => {
    const x = padding.x + (labels.length <= 1 ? 0 : (i * innerW) / (labels.length - 1));
    const y = padding.y + (1 - v / max) * innerH;
    return { x, y };
  });

  const path = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="#fdf8e4" />
      <line x1={padding.x} y1={height - padding.y} x2={width - padding.x} y2={height - padding.y} stroke="#1a2b48" strokeOpacity="0.35" />
      <line x1={padding.x} y1={padding.y} x2={padding.x} y2={height - padding.y} stroke="#1a2b48" strokeOpacity="0.35" />

      <polyline fill="none" stroke="#1a2b48" strokeWidth="3" points={path} />
      {points.map((p, idx) => (
        <circle key={idx} cx={p.x} cy={p.y} r="4" fill="#fcc419" />
      ))}

      {labels.map((label, idx) => {
        const x = padding.x + (labels.length <= 1 ? 0 : (idx * innerW) / (labels.length - 1));
        return (
          <text key={label} x={x} y={height - 6} textAnchor="middle" fontSize="10" fill="#1a2b48" opacity="0.75">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function MiniBarChart({ labels, values }) {
  const width = 640;
  const height = 210;
  const padding = { x: 44, y: 18 };

  const max = Math.max(1, ...values);
  const innerW = width - padding.x * 2;
  const innerH = height - padding.y * 2;

  const barCount = Math.max(1, labels.length);
  const gap = 10;
  const barW = Math.max(10, (innerW - gap * (barCount - 1)) / barCount);

  return (
    <svg className="admin-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Bar chart">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="#fdf8e4" />
      <line x1={padding.x} y1={height - padding.y} x2={width - padding.x} y2={height - padding.y} stroke="#1a2b48" strokeOpacity="0.35" />
      <line x1={padding.x} y1={padding.y} x2={padding.x} y2={height - padding.y} stroke="#1a2b48" strokeOpacity="0.35" />

      {values.map((v, i) => {
        const x = padding.x + i * (barW + gap);
        const h = (v / max) * innerH;
        const y = height - padding.y - h;
        return <rect key={i} x={x} y={y} width={barW} height={h} rx="4" fill="#1a2b48" />;
      })}

      {labels.map((label, idx) => {
        const x = padding.x + idx * (barW + gap) + barW / 2;
        return (
          <text key={label} x={x} y={height - 6} textAnchor="middle" fontSize="10" fill="#1a2b48" opacity="0.75">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

const AdminDashboard = () => {
  const { tutorPosts, qaPosts } = FeedData();
  const [usersById, setUsersById] = useState({});

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
    const end = startOfDay(new Date());
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start, end };
  }, []);

  const weeklyLabels = useMemo(() => ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], []);

  const weeklySeries = useMemo(() => {
    const all = [...(tutorPosts || []), ...(qaPosts || [])];
    const posts = all
      .map((p) => {
        const dt = p?.createdAt?.toDate?.() ?? null;
        return { createdAt: dt, subject: p?.subject || '' };
      })
      .filter((p) => p.createdAt);

    // Find top subject in last 30 days, then plot its last-7-days volume.
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);

    const subjectCounts = new Map();
    posts.forEach((p) => {
      if (p.createdAt < cutoff) return;
      const s = String(p.subject || '').trim();
      if (!s) return;
      subjectCounts.set(s, (subjectCounts.get(s) || 0) + 1);
    });

    const topSubject = Array.from(subjectCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    const values = new Array(7).fill(0);
    const start = range.start;

    posts.forEach((p) => {
      if (!topSubject) return;
      if (String(p.subject || '').trim() !== topSubject) return;
      const day = startOfDay(p.createdAt);
      if (day < start || day > range.end) return;
      const diff = Math.round((day.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 7) values[diff] += 1;
    });

    return { topSubject, values };
  }, [tutorPosts, qaPosts, range.start, range.end]);

  const mostActive = useMemo(() => {
    const all = [...(tutorPosts || []), ...(qaPosts || [])];
    const counts = new Map();
    const tutorCount = new Map();
    const qaCount = new Map();

    all.forEach((p) => {
      const uid = p?.authorId;
      if (!uid) return;
      counts.set(uid, (counts.get(uid) || 0) + 1);
      if (p?.type === 'tutor' || p?.location !== undefined || p?.hours !== undefined) {
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
          else if (q > 0) role = 'คนตอบคำถาม';
          else role = 'student';
        }

        return { no: idx + 1, uid, name, email, year, role };
      });

    return rows;
  }, [tutorPosts, qaPosts, usersById]);

  const monthly = useMemo(() => {
    const labels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const values = new Array(12).fill(0);

    const all = [...(tutorPosts || []), ...(qaPosts || [])];
    all.forEach((p) => {
      const dt = p?.createdAt?.toDate?.() ?? null;
      if (!dt) return;
      const m = dt.getMonth();
      if (m >= 0 && m < 12) values[m] += 1;
    });

    return { labels, values };
  }, [tutorPosts, qaPosts]);

  const rangeLabel = useMemo(() => formatRangeLabel(range.start, range.end), [range.start, range.end]);
  const trendingTitle = weeklySeries.topSubject ? `Top Trending Subjects (${weeklySeries.topSubject})` : 'Top Trending Subjects';

  return (
    <div className="admin-dashboard">
      <h1 className="admin-title">Admin Dashboard</h1>

      <section className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">{trendingTitle}</h2>
          <span className="admin-range">{rangeLabel}</span>
        </div>
        <MiniLineChart labels={weeklyLabels} values={weeklySeries.values.map(clampNumber)} />
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
        <MiniBarChart labels={monthly.labels} values={monthly.values.map(clampNumber)} />
      </section>
    </div>
  );
};

export default AdminDashboard;
