import { serverTimestamp } from 'firebase/firestore';

function asString(value, fallback = '') {
  const next = String(value ?? '').trim();
  return next || fallback;
}

function asNullableString(value) {
  const next = asString(value);
  return next || null;
}

function asPositiveNumber(value, fallback = 0, { integer = false } = {}) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < 0) return fallback;
  return integer ? Math.round(raw) : raw;
}

function normalizeImages(raw) {
  if (Array.isArray(raw?.images)) {
    return raw.images.filter((item) => typeof item === 'string' && item.trim());
  }

  if (typeof raw?.imageUrl === 'string' && raw.imageUrl.trim()) {
    return [raw.imageUrl.trim()];
  }

  return [];
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function buildActorSnapshot(actor = {}) {
  const uid = asNullableString(actor.uid);
  const email = asNullableString(actor.email);
  const displayName =
    asNullableString(actor.displayName)
    || asNullableString(actor.name)
    || email
    || 'User';

  return {
    uid,
    displayName,
    username: asNullableString(actor.username),
    avatarUrl: asString(actor.avatarUrl || actor.photoURL || actor.avatar || ''),
    email,
  };
}

export function buildActorFromCurrentUser(currentUser, authorProfile) {
  return buildActorSnapshot({
    uid: currentUser?.uid,
    email: authorProfile?.email || currentUser?.email,
    displayName: authorProfile?.displayName || currentUser?.displayName || currentUser?.email,
    username: authorProfile?.username,
    avatarUrl: authorProfile?.avatarUrl || authorProfile?.photoURL || currentUser?.photoURL,
  });
}

export function readActorFromDoc(data = {}, fallback = {}) {
  const nested = data?.author && typeof data.author === 'object' ? data.author : null;

  return buildActorSnapshot({
    uid: nested?.uid || data?.authorId || fallback?.uid,
    displayName: nested?.displayName || data?.authorName || fallback?.displayName,
    username: nested?.username || data?.authorUsername || fallback?.username,
    avatarUrl: nested?.avatarUrl || data?.authorAvatar || fallback?.avatarUrl,
    email: nested?.email || fallback?.email,
  });
}

export function readGroupOwnerFromDoc(data = {}) {
  const nested = data?.owner && typeof data.owner === 'object' ? data.owner : null;

  return buildActorSnapshot({
    uid: nested?.uid || data?.ownerId,
    displayName: nested?.displayName || data?.ownerName,
    username: nested?.username,
    avatarUrl: nested?.avatarUrl,
    email: nested?.email,
  });
}

export function readMessageSender(message = {}) {
  const nested = message?.sender && typeof message.sender === 'object' ? message.sender : null;
  return buildActorSnapshot({
    uid: nested?.uid || message?.senderId,
    displayName: nested?.displayName || message?.senderName,
    username: nested?.username,
    avatarUrl: nested?.avatarUrl || message?.senderAvatar,
    email: nested?.email,
  });
}

export function readQaStats(data = {}) {
  const nested = data?.stats && typeof data.stats === 'object' ? data.stats : {};

  return {
    likes: asPositiveNumber(data?.likes ?? data?.likeCount ?? nested?.likeCount, 0, { integer: true }),
    comments: asPositiveNumber(data?.comments ?? data?.commentCount ?? nested?.commentCount, 0, { integer: true }),
    shares: asPositiveNumber(data?.shares ?? data?.shareCount ?? nested?.shareCount, 0, { integer: true }),
  };
}

export function readTutorSchedule(data = {}) {
  const nested = data?.schedule && typeof data.schedule === 'object' ? data.schedule : {};

  return {
    date: asString(nested?.date || data?.date || ''),
    time: asString(nested?.time || data?.time || ''),
    hours: asPositiveNumber(nested?.hours ?? data?.hours, 0),
  };
}

export function readTutorStats(data = {}) {
  const nested = data?.stats && typeof data.stats === 'object' ? data.stats : {};
  const joinersCount = Array.isArray(data?.joiners) ? data.joiners.length : 0;

  const joinedCount = asPositiveNumber(
    nested?.joinedCount ?? data?.joinedCount ?? data?.joinCount,
    joinersCount,
    { integer: true }
  );

  return {
    joinedCount: Math.max(joinersCount, joinedCount),
  };
}

export function buildTutorPostDocument(post, actor) {
  const resolvedActor = buildActorSnapshot(actor);
  const title = asString(post?.title || post?.subject || '', 'Untitled');
  const subject = asString(post?.subject || post?.title || '', 'Untitled');
  const joinedCount = Math.max(1, asPositiveNumber(post?.current, 1, { integer: true }));

  const schedule = {
    date: asString(post?.date || todayIsoDate()),
    time: asString(post?.time || ''),
    hours: Math.max(1, asPositiveNumber(post?.hours, 1)),
  };

  return {
    schemaVersion: 2,
    type: 'tutor',
    author: resolvedActor,
    authorId: resolvedActor.uid,
    authorName: resolvedActor.displayName,
    authorUsername: resolvedActor.username,
    authorAvatar: resolvedActor.avatarUrl,
    subject,
    location: asString(post?.location || ''),
    title,
    description: asString(post?.description || ''),
    experience: asString(post?.experience || ''),
    date: schedule.date,
    time: schedule.time,
    hours: schedule.hours,
    schedule,
    capacity: Math.max(1, asPositiveNumber(post?.capacity, 1, { integer: true })),
    joinedCount,
    joinCount: joinedCount,
    stats: {
      joinedCount,
    },
    images: normalizeImages(post),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildQaPostDocument(post, actor) {
  const resolvedActor = buildActorSnapshot(actor);
  const question = asString(post?.question || post?.title || '', 'Untitled question');

  return {
    schemaVersion: 2,
    type: 'qa',
    author: resolvedActor,
    authorId: resolvedActor.uid,
    authorName: resolvedActor.displayName,
    authorUsername: resolvedActor.username,
    authorAvatar: resolvedActor.avatarUrl,
    subject: asString(post?.subject || ''),
    question,
    description: asString(post?.description || ''),
    date: asString(post?.date || todayIsoDate()),
    images: normalizeImages(post),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    stats: {
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildQaCommentDocument({ uid, text, imageUrl = null, actor = null }) {
  const resolvedActor = actor ? buildActorSnapshot(actor) : null;
  const cleanedText = asString(text || '');

  return {
    author: resolvedActor,
    authorId: asNullableString(uid),
    authorName: resolvedActor?.displayName || null,
    authorUsername: resolvedActor?.username || null,
    authorAvatar: resolvedActor?.avatarUrl || null,
    text: cleanedText,
    imageUrl: asNullableString(imageUrl),
    parentId: null,
    createdAt: serverTimestamp(),
  };
}

export function buildGroupDocument({ postId, postTitle, subject, owner }) {
  const resolvedOwner = buildActorSnapshot(owner);
  const members = resolvedOwner.uid ? [resolvedOwner.uid] : [];

  return {
    schemaVersion: 2,
    postId: asNullableString(postId),
    name: asString(postTitle || '', 'Untitled group'),
    subject: asString(subject || ''),
    owner: resolvedOwner,
    ownerId: resolvedOwner.uid,
    ownerName: resolvedOwner.displayName,
    members,
    memberCount: members.length,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export function buildGroupMessageDocument({ type, text, sender = null, sharedPost = null }) {
  const resolvedSender = sender ? buildActorSnapshot(sender) : null;
  const payload = {
    type: asString(type || 'text'),
    text: asString(text || ''),
    sender: resolvedSender,
    senderId: resolvedSender?.uid || null,
    senderName: resolvedSender?.displayName || null,
    senderAvatar: resolvedSender?.avatarUrl || null,
    timestamp: serverTimestamp(),
  };

  if (sharedPost && typeof sharedPost === 'object') {
    payload.sharedPost = {
      type: asString(sharedPost.type || ''),
      id: asString(sharedPost.id || ''),
      title: asString(sharedPost.title || ''),
      subject: asString(sharedPost.subject || ''),
    };
  }

  return payload;
}
