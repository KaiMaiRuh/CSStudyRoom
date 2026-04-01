import React, { useEffect, useMemo, useState } from 'react';
import { FaSearch, FaTrashAlt, FaUserCheck, FaUserSlash } from 'react-icons/fa';
import './AdminUserManagement.css';
import { useAuth } from '../../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';

const normalize = (v) => String(v || '').toLowerCase().normalize('NFC');

const AdminUserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(() => isFirebaseConfigured());
  const [queryText, setQueryText] = useState('');

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const ref = collection(db, 'users');

    return onSnapshot(
      ref,
      (snap) => {
        const next = snap.docs.map((d) => {
          const data = d.data() || {};
          return {
            uid: d.id,
            name: data.displayName || data.username || data.email || 'Unknown',
            email: data.email || '',
            year: data.year || data.education?.year || '',
            role: data.role || '',
            banned: Boolean(data.banned),
          };
        });
        next.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(next);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe users', err);
        setUsers([]);
        setLoading(false);
      }
    );
  }, []);

  const filtered = useMemo(() => {
    const q = normalize(queryText);
    if (!q) return users;
    return users.filter((u) => {
      return normalize(u.name).includes(q) || normalize(u.email).includes(q) || normalize(u.role).includes(q) || normalize(u.year).includes(q);
    });
  }, [users, queryText]);

  const handleDelete = async (uid) => {
    if (!isFirebaseConfigured()) return;

    const ok = window.confirm('Delete this user document? (Firestore only)');
    if (!ok) return;

    try {
      const { db } = getFirebaseServices();
      await deleteDoc(doc(db, 'users', uid));
    } catch (err) {
      console.error('Failed to delete user', err);
      alert(err?.message || 'Failed to delete user');
    }
  };

  const handleBanToggle = async (uid, currentlyBanned) => {
    if (!isFirebaseConfigured()) return;

    const ok = window.confirm(`${currentlyBanned ? 'Unban' : 'Ban'} this user?`);
    if (!ok) return;

    try {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'users', uid), { banned: !currentlyBanned }, { merge: true });
    } catch (err) {
      console.error('Failed to toggle ban', err);
      alert(err?.message || 'Failed to update ban status');
    }
  };

  return (
    <div className="admin-users">
      <h1 className="admin-title">User Management</h1>

      <section className="admin-users-card">
        <div className="admin-users-head">
          <h2 className="admin-users-subtitle">Student Database</h2>

          <form className="admin-users-search" onSubmit={(e) => e.preventDefault()}>
            <input
              className="admin-users-input"
              placeholder="Search user"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              aria-label="Search user"
            />
            <span className="admin-users-search-icon" aria-hidden="true">
              <FaSearch />
            </span>
          </form>
        </div>

        <div className="admin-users-table-wrap">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th style={{ width: 90 }}>Year</th>
                <th style={{ width: 140 }}>Role</th>
                <th style={{ width: 90, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="admin-users-empty" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((u) => (
                  <tr key={u.uid}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.year}</td>
                    <td>{u.role}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="admin-users-actions">
                        <button
                          type="button"
                          className="admin-users-ban"
                          aria-label={u.banned ? 'Unban user' : 'Ban user'}
                          onClick={() => handleBanToggle(u.uid, u.banned)}
                          disabled={Boolean(currentUser?.uid) && u.uid === currentUser.uid}
                          aria-disabled={Boolean(currentUser?.uid) && u.uid === currentUser.uid}
                          title={u.banned ? 'Unban user' : 'Ban user'}
                        >
                          {u.banned ? <FaUserCheck size={16} /> : <FaUserSlash size={16} />}
                        </button>

                        <button
                          type="button"
                          className="admin-users-delete"
                          aria-label="Delete user"
                          onClick={() => handleDelete(u.uid)}
                          disabled={Boolean(currentUser?.uid) && u.uid === currentUser.uid}
                          aria-disabled={Boolean(currentUser?.uid) && u.uid === currentUser.uid}
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="admin-users-empty" colSpan={5}>
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminUserManagement;
