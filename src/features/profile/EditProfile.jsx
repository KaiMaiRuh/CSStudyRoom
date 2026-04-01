import React, { useEffect, useMemo, useState } from 'react';
import './EditProfile.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
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

function toUniqueStringArray(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  return value
    .map((item) => String(item || '').trim())
    .filter((item) => {
      if (!item) return false;
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
}

function SubjectPicker({
  label,
  selectedSubjects,
  allSubjects,
  pendingSubject,
  onPendingSubjectChange,
  onAddSubject,
  onRemoveSubject,
}) {
  const availableSubjects = allSubjects.filter((subject) => !selectedSubjects.includes(subject));

  return (
    <label className="edit-profile-field edit-profile-field-full">
      <span>{label}</span>

      <div className="subject-picker-control">
        <select
          value={pendingSubject}
          onChange={(e) => onPendingSubjectChange(e.target.value)}
          disabled={availableSubjects.length === 0}
        >
          <option value="">Select a subject</option>
          {availableSubjects.map((subject) => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
        <button
          className="subject-add-btn"
          type="button"
          onClick={onAddSubject}
          disabled={!pendingSubject}
          aria-label={`Add ${label}`}
        >
          +
        </button>
      </div>

      <div className="subject-tags">
        {selectedSubjects.map((subject) => (
          <span key={subject} className="subject-tag">
            {subject}
            <button
              className="subject-tag-remove"
              type="button"
              onClick={() => onRemoveSubject(subject)}
              aria-label={`Remove ${subject}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {selectedSubjects.length === 0 ? <div className="subject-empty">No subjects selected yet.</div> : null}
    </label>
  );
}

export default function EditProfile({ onCancel, onDone, allSubjects = [] }) {
  const { user } = useAuth();
  const [profileDoc, setProfileDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [year, setYear] = useState('');
  const [major, setMajor] = useState('');
  const [university, setUniversity] = useState('');
  const [subjectsToTutor, setSubjectsToTutor] = useState([]);
  const [subjectsNeedingHelp, setSubjectsNeedingHelp] = useState([]);
  const [pendingTutorSubject, setPendingTutorSubject] = useState('');
  const [pendingNeedingHelpSubject, setPendingNeedingHelpSubject] = useState('');
  const [role, setRole] = useState('');
  const [contact, setContact] = useState('');
  const [bio, setBio] = useState('');

  const uid = user?.uid ?? null;

  const pickProfileRevisionFields = (data) => {
    const safe = data && typeof data === 'object' ? data : {};
    const profile = safe.profile && typeof safe.profile === 'object' ? safe.profile : {};
    const education = safe.education && typeof safe.education === 'object'
      ? safe.education
      : (profile.education && typeof profile.education === 'object' ? profile.education : {});

    return {
      displayName: safe.displayName ?? profile.displayName ?? null,
      username: safe.username ?? profile.username ?? null,
      year: safe.year ?? profile.year ?? education.year ?? null,
      education: {
        year: education.year ?? safe.year ?? profile.year ?? null,
        major: education.major ?? null,
        university: education.university ?? null,
      },
      subjectsToTutor: Array.isArray(safe.subjectsToTutor)
        ? safe.subjectsToTutor
        : (Array.isArray(profile.subjectsToTutor) ? profile.subjectsToTutor : []),
      subjectsNeedingHelp: Array.isArray(safe.subjectsNeedingHelp)
        ? safe.subjectsNeedingHelp
        : (Array.isArray(profile.subjectsNeedingHelp) ? profile.subjectsNeedingHelp : []),
      role: safe.role ?? profile.role ?? null,
      contactText: safe.contactText ?? profile.contactText ?? null,
      bio: safe.bio ?? profile.bio ?? null,
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
    const profileData = data.profile && typeof data.profile === 'object' ? data.profile : {};
    const education = data.education && typeof data.education === 'object'
      ? data.education
      : (profileData.education && typeof profileData.education === 'object' ? profileData.education : {});
    const contactFromLegacy = [data.contact?.discord, data.contact?.line].filter(Boolean).join(' / ');

    return {
      displayName: profileData.displayName || data.displayName || user?.displayName || '',
      username: profileData.username || data.username || '',
      year: profileData.year || data.year || education.year || '',
      major: education.major || '',
      university: education.university || '',
      subjectsToTutor: toUniqueStringArray(profileData.subjectsToTutor || data.subjectsToTutor),
      subjectsNeedingHelp: toUniqueStringArray(profileData.subjectsNeedingHelp || data.subjectsNeedingHelp),
      role: profileData.role || data.role || '',
      contact: profileData.contactText || data.contactText || contactFromLegacy || '',
      bio: profileData.bio || data.bio || '',
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
    setPendingTutorSubject('');
    setPendingNeedingHelpSubject('');
    setRole(initial.role);
    setContact(initial.contact);
    setBio(initial.bio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleAddSubject = (pendingSubject, setPendingSubject, setSubjects) => {
    const cleaned = String(pendingSubject || '').trim();
    if (!cleaned) return;

    setSubjects((prev) => {
      if (prev.includes(cleaned)) return prev;
      return [...prev, cleaned];
    });
    setPendingSubject('');
  };

  const handleRemoveSubject = (subject, setSubjects) => {
    setSubjects((prev) => prev.filter((item) => item !== subject));
  };

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

      const nextProfile = {
        displayName: nextDisplayName,
        username: nextUsername,
        year: year ? String(year).trim() : null,
        education: {
          year: year ? String(year).trim() : null,
          major: major ? String(major).trim() : null,
          university: university ? String(university).trim() : null,
        },
        subjectsToTutor: toUniqueStringArray(subjectsToTutor),
        subjectsNeedingHelp: toUniqueStringArray(subjectsNeedingHelp),
        role: role ? String(role).trim() : null,
        contactText: contact ? String(contact).trim() : null,
        bio: bio ? String(bio).trim() : null,
      };

      const nextProfileDoc = {
        uid,
        email: user?.email || null,
        ...nextProfile,
        profile: nextProfile,
        meta: {
          updatedAt: serverTimestamp(),
        },
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
          <div className="edit-profile-hint">Please log in first.</div>
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

          <SubjectPicker
            label="Subjects to Tutor"
            selectedSubjects={subjectsToTutor}
            allSubjects={allSubjects}
            pendingSubject={pendingTutorSubject}
            onPendingSubjectChange={setPendingTutorSubject}
            onAddSubject={() => handleAddSubject(pendingTutorSubject, setPendingTutorSubject, setSubjectsToTutor)}
            onRemoveSubject={(subject) => handleRemoveSubject(subject, setSubjectsToTutor)}
          />

          <SubjectPicker
            label="Subjects Needing Help"
            selectedSubjects={subjectsNeedingHelp}
            allSubjects={allSubjects}
            pendingSubject={pendingNeedingHelpSubject}
            onPendingSubjectChange={setPendingNeedingHelpSubject}
            onAddSubject={() => handleAddSubject(pendingNeedingHelpSubject, setPendingNeedingHelpSubject, setSubjectsNeedingHelp)}
            onRemoveSubject={(subject) => handleRemoveSubject(subject, setSubjectsNeedingHelp)}
          />

          <label className="edit-profile-field edit-profile-field-full">
            <span>Contact</span>
            <textarea value={contact} onChange={(e) => setContact(e.target.value)} rows={3} />
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