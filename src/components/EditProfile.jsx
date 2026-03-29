import React, { useEffect, useMemo, useState } from 'react';
import './EditProfile.css';
import { useAuth } from '../auth/AuthContext';
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  addDoc,
} from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';

function toCommaString(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  return '';
}

function toStringArray(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function EditProfile({ onCancel, onDone }) {
  const { user } = useAuth();
  const [profileDoc, setProfileDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [university, setUniversity] = useState('');
  const [subjectsToTutor, setSubjectsToTutor] = useState('');
  const [subjectsNeedingHelp, setSubjectsNeedingHelp] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');
  const [bio, setBio] = useState('');

  const uid = user?.uid ?? null;

  const pickProfileRevisionFields = (data) => {
    const safe = data && typeof data === 'object' ? data : {};
    return {
      displayName: safe.displayName ?? null,
      username: safe.username ?? null,
      year: safe.year ?? safe.education?.year ?? null,
      education: {
        year: safe.education?.year ?? safe.year ?? null,
        major: safe.education?.major ?? null,
        university: safe.education?.university ?? null,
      },
      subjectsToTutor: Array.isArray(safe.subjectsToTutor) ? safe.subjectsToTutor : [],
      subjectsNeedingHelp: Array.isArray(safe.subjectsNeedingHelp) ? safe.subjectsNeedingHelp : [],
      role: safe.role ?? null,
      contactText: safe.contactText ?? null,
      bio: safe.bio ?? null,
    };
  };

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', uid);

    return onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : null;
        setProfileDoc(data);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load profile', err);
        setLoading(false);
      }
    );
  }, [uid]);

  const initial = useMemo(() => {
    const data = profileDoc || {};
    const contactFromLegacy = [data.contact?.discord, data.contact?.line].filter(Boolean).join(' / ');
    return {
      displayName: data.displayName || user?.displayName || '',
      username: data.username || '',
      year: data.year || data.education?.year || '',
      major: data.education?.major || '',
      university: data.education?.university || '',
      subjectsToTutor: toCommaString(data.subjectsToTutor),
      subjectsNeedingHelp: toCommaString(data.subjectsNeedingHelp),
      role: data.role || '',
      contact: data.contactText || contactFromLegacy || '',
      bio: data.bio || '',
    };
  }, [profileDoc, user?.displayName]);

  useEffect(() => {
    if (loading) return;
    setDisplayName(initial.displayName);
    setUsername(initial.username);
    setYear(initial.year);
    setMajor(initial.major);
    setUniversity(initial.university);
    setSubjectsToTutor(initial.subjectsToTutor);
    setSubjectsNeedingHelp(initial.subjectsNeedingHelp);
    setRole(initial.role);
    setContact(initial.contact);
    setBio(initial.bio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleSave = async () => {
    if (!uid) return;
    if (!isFirebaseConfigured()) {
      alert('Firebase is not configured');
      return;
    }

    const nextDisplayName = String(displayName || '').trim();
    const nextUsername = String(username || '').trim();

    if (!nextDisplayName) {
      alert('Name is required');
      return;
    }

    if (!nextUsername) {
      alert('Username is required');
      return;
    }

    try {
      setSaving(true);
      const { auth, db } = getFirebaseServices();

      const userRef = doc(db, 'users', uid);
      let beforeProfile = null;
      try {
        const beforeSnap = await getDoc(userRef);
        beforeProfile = beforeSnap.exists() ? pickProfileRevisionFields(beforeSnap.data()) : null;
      } catch (err) {
        console.warn('Failed to read profile before saving revision', err);
      }

      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { displayName: nextDisplayName });
      }

      const nextProfileDoc = {
        uid,
        email: user?.email || null,
        displayName: nextDisplayName,
        username: nextUsername,
        year: year ? String(year).trim() : null,
        education: {
          year: year ? String(year).trim() : null,
          major: major ? String(major).trim() : null,
          university: university ? String(university).trim() : null,
        },
        subjectsToTutor: toStringArray(subjectsToTutor),
        subjectsNeedingHelp: toStringArray(subjectsNeedingHelp),
        role: role ? String(role).trim() : null,
        contactText: contact ? String(contact).trim() : null,
        bio: bio ? String(bio).trim() : null,
        updatedAt: serverTimestamp(),
      };

      await setDoc(userRef, nextProfileDoc, { merge: true });

      try {
        await addDoc(collection(db, 'users', uid, 'revisions'), {
          type: 'profile',
          editorId: uid,
          createdAt: serverTimestamp(),
          before: beforeProfile,
          after: pickProfileRevisionFields(nextProfileDoc),
        });
      } catch (err) {
        console.warn('Failed to write profile revision history', err);
      }

      onDone?.();
    } catch (err) {
      console.error('Failed to save profile', err);
      alert(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (!uid) {
    return (
      <div className="edit-profile-container">
        <div className="edit-profile-card">
          <div className="edit-profile-title">Edit Profile</div>
          <div className="edit-profile-hint">Please sign in first.</div>
          <div className="edit-profile-actions">
            <button className="edit-profile-btn-secondary" type="button" onClick={onCancel}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      <div className="edit-profile-card">
        <div className="edit-profile-title">Edit Profile</div>

        <div className="edit-profile-grid">
          <label className="edit-profile-field">
            <span>Name</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field">
            <span>Year</span>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select an option</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6+">6 or more</option>
            </select>
          </label>

          <label className="edit-profile-field">
            <span>Major</span>
            <select value={major} onChange={(e) => setMajor(e.target.value)}>
              <option value="">Select an option</option>
              <option value="CS">CS</option>
              <option value="CSB">CSB</option>
            </select>
          </label>

          <label className="edit-profile-field">
            <span>University</span>
            <input value={university} onChange={(e) => setUniversity(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field">
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">Select an option</option>
              <option value="Tutor">Tutor</option>
              <option value="Student">Student</option>
              <option value="Both">Both</option>
            </select>
          </label>

          <label className="edit-profile-field edit-profile-field-full">
            <span>Subjects to Tutor (comma-separated)</span>
            <input value={subjectsToTutor} onChange={(e) => setSubjectsToTutor(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field edit-profile-field-full">
            <span>Subjects Needing Help (comma-separated)</span>
            <input value={subjectsNeedingHelp} onChange={(e) => setSubjectsNeedingHelp(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field edit-profile-field-full">
            <span>Contact</span>
            <input value={contact} onChange={(e) => setContact(e.target.value)} type="text" />
          </label>

          <label className="edit-profile-field edit-profile-field-full">
            <span>Bio/Experience</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />
          </label>
        </div>

        <div className="edit-profile-actions">
          <button className="edit-profile-btn-secondary" type="button" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="edit-profile-btn-primary" type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}