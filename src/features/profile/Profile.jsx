/* Profile component */
import React, { useEffect, useMemo, useState } from 'react';
import { FaCamera, FaPencilAlt, FaTrashAlt, FaUserCircle, FaUsers } from 'react-icons/fa';
import './Profile.css';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getFirebaseServices, isFirebaseConfigured } from '../../api/firebaseConfig.js';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { imageFileToBase64DataUrl } from '../../utils/imageHelpers.js';
import ImagePreviewModal from '../../components/common/ImagePreviewModal.jsx';

function toIsoDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : toIsoDate(parsed);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return toIsoDate(value);
  }

  const asDate = value?.toDate?.();
  if (asDate instanceof Date && !Number.isNaN(asDate.getTime())) {
    return toIsoDate(asDate);
  }

  return '';
}

const Profile = ({ viewUid = null, tutorPosts = [], qaPosts = [], onEdit, onEditPost, onDeletePost }) => {
  const { user } = useAuth();
  const [profileState, setProfileState] = useState({ uid: null, data: null });
  const [isAvatarSaving, setIsAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [previewSrc, setPreviewSrc] = useState(null);
  const [selectedProfilePanel, setSelectedProfilePanel] = useState('past-posts');
  const [selectedPostType, setSelectedPostType] = useState('tutor');
  const [profilePostsState, setProfilePostsState] = useState({ uid: null, tutor: [], qa: [] });
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [joinedGroupsState, setJoinedGroupsState] = useState({ uid: null, data: [] });
  const [isJoinedGroupsLoading, setIsJoinedGroupsLoading] = useState(false);

  const targetUid = viewUid || user?.uid || null;
  const isOwnProfile = Boolean(user?.uid && targetUid && user.uid === targetUid);

  useEffect(() => {
    if (!isOwnProfile && selectedProfilePanel === 'joined-groups') {
      setSelectedProfilePanel('past-posts');
    }
  }, [isOwnProfile, selectedProfilePanel]);

  useEffect(() => {
    if (!targetUid) return;
    if (!isFirebaseConfigured()) return;

    const { db } = getFirebaseServices();
    const ref = doc(db, 'users', targetUid);

    return onSnapshot(
      ref,
      (snap) => {
        setProfileState({ uid: targetUid, data: snap.exists() ? snap.data() : null });
      },
      (err) => {
        console.error('Failed to load profile', err);
      }
    );
  }, [targetUid]);

  const profileDoc = targetUid && profileState.uid === targetUid ? profileState.data : null;

  useEffect(() => {
    let disposed = false;

    if (!targetUid) {
      Promise.resolve().then(() => {
        if (disposed) return;
        setProfilePostsState({ uid: null, tutor: [], qa: [] });
        setIsPostsLoading(false);
      });
      return () => {
        disposed = true;
      };
    }

    if (!isFirebaseConfigured()) {
      Promise.resolve().then(() => {
        if (disposed) return;
        setProfilePostsState({ uid: targetUid, tutor: [], qa: [] });
        setIsPostsLoading(false);
      });
      return () => {
        disposed = true;
      };
    }

    Promise.resolve().then(() => {
      if (disposed) return;
      setIsPostsLoading(true);
    });

    const { db } = getFirebaseServices();

    const readOwnedPosts = async (collectionName) => {
      const byAuthorIdQ = query(collection(db, collectionName), where('authorId', '==', targetUid));
      const byNestedAuthorUidQ = query(collection(db, collectionName), where('author.uid', '==', targetUid));

      const [byAuthorIdSnap, byNestedAuthorUidSnap] = await Promise.all([
        getDocs(byAuthorIdQ).catch((err) => {
          console.warn(`Failed to read ${collectionName} by authorId`, err);
          return null;
        }),
        getDocs(byNestedAuthorUidQ).catch((err) => {
          console.warn(`Failed to read ${collectionName} by author.uid`, err);
          return null;
        }),
      ]);

      const mergedMap = new Map();
      [byAuthorIdSnap, byNestedAuthorUidSnap].forEach((snap) => {
        if (!snap) return;
        snap.docs.forEach((docSnap) => {
          mergedMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      });

      return Array.from(mergedMap.values());
    };

    void Promise.all([
      readOwnedPosts('tutorPosts'),
      readOwnedPosts('qaPosts'),
    ])
      .then(([tutorDocs, qaDocs]) => {
        if (disposed) return;
        setProfilePostsState({
          uid: targetUid,
          tutor: Array.isArray(tutorDocs) ? tutorDocs : [],
          qa: Array.isArray(qaDocs) ? qaDocs : [],
        });
      })
      .catch((err) => {
        console.error('Failed to load profile posts', err);
        if (disposed) return;
        setProfilePostsState({ uid: targetUid, tutor: [], qa: [] });
      })
      .finally(() => {
        if (disposed) return;
        setIsPostsLoading(false);
      });

    return () => {
      disposed = true;
    };
  }, [targetUid]);

  useEffect(() => {
    let disposed = false;
    let fallbackUnsubscribe = null;

    if (!isOwnProfile || !targetUid) {
      Promise.resolve().then(() => {
        if (disposed) return;
        setJoinedGroupsState({ uid: null, data: [] });
        setIsJoinedGroupsLoading(false);
      });
      return () => {
        disposed = true;
      };
    }

    if (!isFirebaseConfigured()) {
      Promise.resolve().then(() => {
        if (disposed) return;
        setJoinedGroupsState({ uid: targetUid, data: [] });
        setIsJoinedGroupsLoading(false);
      });
      return () => {
        disposed = true;
      };
    }

    Promise.resolve().then(() => {
      if (disposed) return;
      setIsJoinedGroupsLoading(true);
    });

    const { db } = getFirebaseServices();
    const groupsRef = collection(db, 'groups');
    const groupsQuery = query(groupsRef, where('members', 'array-contains', targetUid));

    const applyJoinedGroups = (docs) => {
      const groups = docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((group) => {
          if (!group) return false;
          const ownerUid = group.owner?.uid || group.ownerId || null;
          return ownerUid !== targetUid;
        });

      setJoinedGroupsState({ uid: targetUid, data: groups });
      setIsJoinedGroupsLoading(false);
    };

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        if (disposed) return;
        applyJoinedGroups(snapshot.docs);
      },
      (err) => {
        console.error('Failed to load joined groups', err);
        if (disposed) return;

        if (err?.code === 'failed-precondition' || err?.message?.includes('index')) {
          if (fallbackUnsubscribe) return;

          fallbackUnsubscribe = onSnapshot(
            groupsRef,
            (snapshot) => {
              if (disposed) return;
              const filteredDocs = snapshot.docs.filter((docSnap) => {
                const group = docSnap.data();
                return Array.isArray(group?.members) && group.members.includes(targetUid);
              });
              applyJoinedGroups(filteredDocs);
            },
            (fallbackErr) => {
              console.error('Failed to load joined groups via fallback', fallbackErr);
              if (disposed) return;
              setJoinedGroupsState({ uid: targetUid, data: [] });
              setIsJoinedGroupsLoading(false);
            }
          );
          return;
        }

        setJoinedGroupsState({ uid: targetUid, data: [] });
        setIsJoinedGroupsLoading(false);
      }
    );

    return () => {
      disposed = true;
      unsubscribe();
      if (typeof fallbackUnsubscribe === 'function') {
        fallbackUnsubscribe();
      }
    };
  }, [isOwnProfile, targetUid]);

  const userProfile = useMemo(() => {
    const docData = profileDoc || {};
    const displayName =
      docData.displayName ||
      (isOwnProfile ? (user?.displayName || user?.email) : null) ||
      'User';
    const education = docData.education || {};
    const contact = docData.contact || {};
    const contactFromLegacy = [contact.discord, contact.line].filter(Boolean).join(' / ');

    const mergedYear = docData.year || education.year || '';

    return {
      name: displayName,
      username: docData.username || '',
      avatarUrl: docData.avatarUrl || '',
      education: {
        year: mergedYear,
        major: education.major || '',
        university: education.university || '',
      },
      subjectsToTutor: Array.isArray(docData.subjectsToTutor) ? docData.subjectsToTutor : [],
      subjectsNeedingHelp: Array.isArray(docData.subjectsNeedingHelp) ? docData.subjectsNeedingHelp : [],
      role: docData.role || '',
      contactText: docData.contactText || contactFromLegacy || '',
      bio: docData.bio || '',
    };
  }, [profileDoc, isOwnProfile, user?.displayName, user?.email]);

  const handleAvatarChange = async (file) => {
    if (!file) return;
    if (!isOwnProfile || !user?.uid) return;
    if (!isFirebaseConfigured()) return;

    try {
      setAvatarError('');
      setIsAvatarSaving(true);
      const dataUrl = await imageFileToBase64DataUrl(file, { targetBytes: 300 * 1024 });
      const { db } = getFirebaseServices();
      const ref = doc(db, 'users', user.uid);

      let beforeAvatarUrl = '';
      try {
        const beforeSnap = await getDoc(ref);
        beforeAvatarUrl = beforeSnap.data()?.avatarUrl || '';
      } catch (err) {
        console.warn('Failed to read current avatarUrl before update', err);
      }

      await setDoc(
        ref,
        {
          avatarUrl: dataUrl,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      try {
        await addDoc(collection(db, 'users', user.uid, 'revisions'), {
          type: 'avatar',
          editorId: user.uid,
          createdAt: serverTimestamp(),
          before: { avatarUrl: beforeAvatarUrl || '' },
          after: { avatarUrl: dataUrl },
          file: {
            name: file?.name || null,
            size: typeof file?.size === 'number' ? file.size : null,
            type: file?.type || null,
          },
        });
      } catch (err) {
        console.warn('Failed to write avatar revision history', err);
      }

      const tutorQ = query(collection(db, 'tutorPosts'), where('authorId', '==', user.uid));
      const qaQ = query(collection(db, 'qaPosts'), where('authorId', '==', user.uid));
      const [tutorSnap, qaSnap] = await Promise.all([getDocs(tutorQ), getDocs(qaQ)]);
      const allRefs = [...tutorSnap.docs, ...qaSnap.docs].map((d) => d.ref);

      for (let start = 0; start < allRefs.length; start += 450) {
        const batch = writeBatch(db);
        const slice = allRefs.slice(start, start + 450);
        slice.forEach((postRef) => {
          batch.update(postRef, { authorAvatar: dataUrl, updatedAt: serverTimestamp() });
        });
        await batch.commit();
      }
    } catch (err) {
      console.error('Failed to update avatar', err);
      setAvatarError(err?.message || 'Failed to update profile image');
    } finally {
      setIsAvatarSaving(false);
    }
  };

  const pastPosts = useMemo(() => {
    const uid = targetUid;
    if (!uid) return [];

    const isOwnedByUid = (post, ownerUid) => {
      if (!post || !ownerUid) return false;
      return (
        post.authorId === ownerUid
        || post.author?.uid === ownerUid
        || post.user?.uid === ownerUid
        || post.uid === ownerUid
      );
    };

    const tutorSource = [
      ...(Array.isArray(tutorPosts) ? tutorPosts : []),
      ...(profilePostsState.uid === uid && Array.isArray(profilePostsState.tutor) ? profilePostsState.tutor : []),
    ];
    const qaSource = [
      ...(Array.isArray(qaPosts) ? qaPosts : []),
      ...(profilePostsState.uid === uid && Array.isArray(profilePostsState.qa) ? profilePostsState.qa : []),
    ];

    const tutorUnique = Array.from(
      new Map(
        tutorSource
          .filter((p) => p && p.id != null)
          .map((p) => [String(p.id), p])
      ).values()
    );

    const qaUnique = Array.from(
      new Map(
        qaSource
          .filter((p) => p && p.id != null)
          .map((p) => [String(p.id), p])
      ).values()
    );

    const tutor = tutorUnique
      .filter((p) => isOwnedByUid(p, uid))
      .map((p) => ({
        id: `tutor-${p.id}`,
        rawId: p.id,
        type: 'tutor',
        title: p.title || p.subject || 'Tutor post',
        date: formatDateLabel(p.date) || formatDateLabel(p.createdAt),
        description: p.description || '',
        raw: p,
      }));

    const qa = qaUnique
      .filter((p) => isOwnedByUid(p, uid))
      .map((p) => ({
        id: `qa-${p.id}`,
        rawId: p.id,
        type: 'qa',
        title: p.question || p.subject || 'Q&A post',
        date: formatDateLabel(p.date) || formatDateLabel(p.createdAt),
        description: p.description || '',
        raw: p,
      }));

    return [...tutor, ...qa].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  }, [tutorPosts, qaPosts, profilePostsState, targetUid]);

  const joinedGroups = useMemo(() => {
    if (!isOwnProfile || !targetUid || joinedGroupsState.uid !== targetUid) return [];

    return (Array.isArray(joinedGroupsState.data) ? joinedGroupsState.data : [])
      .map((group) => {
        const memberCount = Number(group?.memberCount ?? group?.members?.length ?? 0);
        const ownerName = group?.owner?.displayName || group?.ownerName || 'Unknown';
        const sourcePostType = group?.postType === 'qa' ? 'qa' : 'tutor';
        const sourcePostId = group?.postId || null;
        return {
          id: String(group?.id || group?.postId || ownerName),
          groupId: group?.id || null,
          title: group?.name || 'Joined group',
          subject: group?.subject || '',
          ownerName,
          memberCount: Number.isFinite(memberCount) ? memberCount : 0,
          sourcePostId,
          sourcePostType,
          sourcePostHash: sourcePostId ? `/${sourcePostType}/${sourcePostId}` : null,
          dateLabel: formatDateLabel(group?.updatedAt) || formatDateLabel(group?.createdAt),
          sortValue: group?.updatedAt?.toMillis?.() || group?.createdAt?.toMillis?.() || 0,
        };
      })
      .sort((a, b) => b.sortValue - a.sortValue);
  }, [isOwnProfile, joinedGroupsState, targetUid]);

  const normalizedRole = String(userProfile.role || '').toLowerCase();
  const showTutorSubjects = normalizedRole === 'tutor' || normalizedRole === 'both';
  const showStudentSubjects = normalizedRole === 'student' || normalizedRole === 'both';
  const isPastPostsView = selectedProfilePanel === 'past-posts';
  const filteredPastPosts = useMemo(
    () => pastPosts.filter((post) => post.type === selectedPostType),
    [pastPosts, selectedPostType]
  );

  return (
    <div className="profile-container">
      {previewSrc ? <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} /> : null}
      {/* Top */}
      <div className="profile-header">
        <div className="profile-avatar-block">
          <div className="profile-circle-wrap">
            <div className="profile-circle">
              {userProfile.avatarUrl ? (
                <img
                  className="profile-avatar-img"
                  src={userProfile.avatarUrl}
                  alt=""
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewSrc(userProfile.avatarUrl)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPreviewSrc(userProfile.avatarUrl);
                  }}
                />
              ) : (
                <FaUserCircle className="profile-avatar-fallback" />
              )}
            </div>

            {isOwnProfile ? (
              <label
                className="camera-icon"
                title="Change profile image"
                style={isAvatarSaving ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
                onClick={(e) => e.stopPropagation()}
              >
                <FaCamera className="camera-icon-camera" />
                <input
                  className="profile-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                />
              </label>
            ) : null}
          </div>

          {avatarError ? <div className="profile-avatar-error">{avatarError}</div> : null}
        </div>
        <div className="profile-info">
          <h1 className="profile-name">{userProfile.name}</h1>
          {userProfile.username && <div className="profile-handle">@{userProfile.username}</div>}
          {isOwnProfile ? (
            <button className="edit-profile-btn" type="button" onClick={() => onEdit?.()}>
              Edit profile
            </button>
          ) : null}
        </div>
      </div>

      <div className="divider"></div>

      {/* Bottom */}
      <div className="profile-content">
        {/* Left - Info */}
        <div className="profile-left-panel">
          <div className="user-info-section">
            <h2>Education</h2>
            <p><strong>Year:</strong> {userProfile.education.year}</p>
            <p><strong>Major:</strong> {userProfile.education.major}</p>
            <p><strong>University:</strong> {userProfile.education.university}</p>
          </div>

          {showTutorSubjects && (
            <div className="subjects-section">
              <h2>Subjects to Tutor</h2>
              <ul>
                {(userProfile.subjectsToTutor.length ? userProfile.subjectsToTutor : ['-']).map((subject, index) => (
                  <li key={index}>{subject}</li>
                ))}
              </ul>
            </div>
          )}

          {showStudentSubjects && (
            <div className="subjects-section">
              <h2>Subjects Needing Help</h2>
              <ul>
                {(userProfile.subjectsNeedingHelp.length ? userProfile.subjectsNeedingHelp : ['-']).map((subject, index) => (
                  <li key={index}>{subject}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="info-section">
            <h2>Role</h2>
            <p>{userProfile.role || '-'}</p>
          </div>

          <div className="contact-section">
            <h2>Contact</h2>
            <p className="profile-multiline-text">{userProfile.contactText || '-'}</p>
          </div>

          <div className="bio-section">
            <h2>Bio/Experience</h2>
            <p className="profile-multiline-text">{userProfile.bio || '-'}</p>
          </div>
        </div>

        {/* Right - Posts */}
        <div className="profile-right-panel">
          <div className="profile-panel-tabs" aria-label="Profile content sections">
            <button
              type="button"
              className={`profile-panel-tab ${isPastPostsView ? 'active' : ''}`}
              aria-pressed={isPastPostsView}
              onClick={() => setSelectedProfilePanel('past-posts')}
            >
              Past Posts
            </button>
            {isOwnProfile ? (
              <button
                type="button"
                className={`profile-panel-tab ${selectedProfilePanel === 'joined-groups' ? 'active' : ''}`}
                aria-pressed={selectedProfilePanel === 'joined-groups'}
                onClick={() => setSelectedProfilePanel('joined-groups')}
              >
                Joined Group
              </button>
            ) : null}
          </div>

          {isPastPostsView ? (
            <>
              <div className="posts-header">
                <h2>Past Posts</h2>
              </div>

              <div className="post-type-tabs" role="tablist" aria-label="Past post categories">
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedPostType === 'tutor'}
                  className={`post-type-tab ${selectedPostType === 'tutor' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('tutor')}
                >
                  Tutor post
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedPostType === 'qa'}
                  className={`post-type-tab ${selectedPostType === 'qa' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('qa')}
                >
                  Q&amp;A post
                </button>
              </div>

              <div className="posts-list">
                {isPostsLoading ? (
                  <div className="post-empty-state">Loading posts...</div>
                ) : null}
                {filteredPastPosts.map((post) => (
                  <div key={post.id} className="post-card">
                    <div className="post-icon"><FaUserCircle /></div>
                    <div className="post-details">
                      <h3>{post.title}</h3>
                      <p>{post.description}</p>
                      <p className="post-date">{post.date}</p>
                    </div>
                    {isOwnProfile ? (
                      <div className="post-actions">
                        <button
                          className="edit-btn"
                          type="button"
                          onClick={() => onEditPost?.({ type: post.type, id: post.rawId, post: post.raw })}
                          title="Edit"
                        >
                          <FaPencilAlt />
                        </button>
                        <button
                          className="delete-btn"
                          type="button"
                          onClick={() => onDeletePost?.({ type: post.type, id: post.rawId, post: post.raw })}
                          title="Delete"
                        >
                          <FaTrashAlt />
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {filteredPastPosts.length === 0 ? (
                  <div className="post-empty-state">No posts in this category</div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div className="posts-header">
                <h2>Joined Group</h2>
              </div>

              <div className="posts-list">
                {isJoinedGroupsLoading ? (
                  <div className="post-empty-state">Loading joined groups...</div>
                ) : null}
                {joinedGroups.map((group) => (
                  <div key={group.id} className="post-card joined-group-card">
                    <div className="post-icon"><FaUsers /></div>
                    <div className="post-details">
                      <h3>{group.title}</h3>
                      <p>{group.subject ? `Subject: ${group.subject}` : 'Joined tutor group'}</p>
                      <p className="post-date">
                        {group.memberCount} members • by {group.ownerName}
                        {group.dateLabel ? ` • ${group.dateLabel}` : ''}
                      </p>
                      <div className="joined-group-actions">
                        <button
                          type="button"
                          className="joined-group-action joined-group-action-secondary"
                          disabled={!group.sourcePostHash}
                          onClick={() => {
                            if (!group.sourcePostHash) return;
                            window.location.hash = group.sourcePostHash;
                          }}
                        >
                          View Post
                        </button>
                        <button
                          type="button"
                          className="joined-group-action joined-group-action-primary"
                          disabled={!group.groupId}
                          onClick={() => {
                            if (!group.groupId) return;
                            window.location.hash = `/groupmessage/${group.groupId}`;
                          }}
                        >
                          Open Group chat
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {!isJoinedGroupsLoading && joinedGroups.length === 0 ? (
                  <div className="post-empty-state">You have not joined any groups yet</div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;