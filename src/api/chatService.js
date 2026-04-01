// chatService.js - Helper functions for group messages
import {
  collection,
  doc,
  getDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { getFirebaseServices, isFirebaseConfigured } from './firebaseConfig.js';
import {
  COLLECTIONS,
  groupDocPath,
  groupMessageDocPath,
  groupMessagesPath,
  qaPostDocPath,
  tutorPostDocPath,
} from './dbSchema.js';
import {
  buildActorSnapshot,
  buildGroupDocument,
  buildGroupMessageDocument,
} from './dbModels.js';

export async function createGroup(postId, postTitle, subject, ownerId, ownerName, ownerAvatar = null, ownerUsername = null) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const owner = buildActorSnapshot({
    uid: ownerId,
    displayName: ownerName,
    username: ownerUsername,
    avatarUrl: ownerAvatar,
  });

  const groupData = buildGroupDocument({
    postId,
    postTitle,
    subject,
    owner,
  });

  const docRef = await addDoc(collection(db, COLLECTIONS.GROUPS), groupData);
  return docRef.id;
}

export async function addMemberToGroup(groupId, userId, userName) {
  void userName;
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  try {
    const groupRef = doc(db, ...groupDocPath(groupId));
    const groupSnap = await getDoc(groupRef);
    const members = groupSnap.data()?.members || [];

    if (!members.includes(userId)) {
      await updateDoc(groupRef, {
        members: arrayUnion(userId),
        memberCount: members.length + 1,
      });
    }
  } catch (error) {
    console.error('Error adding member to group:', error);
    throw error;
  }
}

export async function removeMemberFromGroup(groupId, userId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const groupRef = doc(db, ...groupDocPath(groupId));
  const groupSnap = await getDoc(groupRef);

  if (!groupSnap.exists()) {
    return;
  }

  const members = groupSnap.data()?.members || [];
  if (!members.includes(userId)) {
    return;
  }

  const newCount = Math.max(0, members.length - 1);
  await updateDoc(groupRef, {
    members: arrayRemove(userId),
    memberCount: newCount,
  });
}

export function subscribeToUserGroups(userId, callback) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const q = query(
    collection(db, COLLECTIONS.GROUPS),
    where('members', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const sorted = groups.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      console.log('Loaded groups for user', userId, ':', sorted);
      callback(sorted);
    },
    (error) => {
      console.error('Error loading groups:', error);
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Falling back to client-side filtering');
        const unsubscribe = onSnapshot(
          collection(db, COLLECTIONS.GROUPS),
          (snapshot) => {
            const allGroups = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            const userGroups = allGroups.filter(
              group => group.members && Array.isArray(group.members) && group.members.includes(userId)
            );
            const sorted = userGroups.sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || 0;
              return timeB - timeA;
            });
            console.log('Filtered groups for user', userId, ':', sorted);
            callback(sorted);
          },
          (err) => {
            console.error('Error in fallback groups loading:', err);
          }
        );
        return unsubscribe;
      }
    }
  );
}

export async function sendGroupMessage(groupId, senderId, text, sender = null) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!senderId) {
    throw new Error('senderId is required');
  }

  const cleanedText = String(text || '').trim();
  if (!cleanedText) {
    throw new Error('Message cannot be empty');
  }

  const { db } = getFirebaseServices();

  const senderActor = buildActorSnapshot({
    uid: senderId,
    displayName: sender?.senderName || sender?.displayName,
    username: sender?.senderUsername || sender?.username,
    avatarUrl: sender?.senderAvatar || sender?.avatarUrl,
    email: sender?.email,
  });

  const messageData = buildGroupMessageDocument({
    type: 'text',
    text: cleanedText,
    sender: senderActor,
  });

  const msgRef = await addDoc(collection(db, ...groupMessagesPath(groupId)), messageData);

  return msgRef.id;
}

export async function sendSystemMessage(groupId, text, sender = null) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const cleanedText = String(text || '').trim();
  if (!cleanedText) {
    throw new Error('Message cannot be empty');
  }

  const { db } = getFirebaseServices();

  const senderActor = sender
    ? buildActorSnapshot({
      uid: sender?.senderId || sender?.uid,
      displayName: sender?.senderName || sender?.displayName,
      username: sender?.senderUsername || sender?.username,
      avatarUrl: sender?.senderAvatar || sender?.avatarUrl,
      email: sender?.email,
    })
    : null;

  const messageData = buildGroupMessageDocument({
    type: 'system',
    text: cleanedText,
    sender: senderActor,
  });

  const msgRef = await addDoc(collection(db, ...groupMessagesPath(groupId)), messageData);

  return msgRef.id;
}

export async function sendSharedPostMessage({ groupId, senderId, senderName, senderAvatar = null, postType, postId }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }
  if (!groupId) throw new Error('groupId is required');
  if (!senderId) throw new Error('senderId is required');
  if (!senderName) throw new Error('senderName is required');
  if (postType !== 'qa' && postType !== 'tutor') throw new Error('Invalid postType');
  if (!postId) throw new Error('postId is required');
  void senderAvatar;

  const { db } = getFirebaseServices();

  const postRef = doc(db, ...(postType === 'qa' ? qaPostDocPath(postId) : tutorPostDocPath(postId)));
  const postSnap = await getDoc(postRef);
  if (!postSnap.exists()) {
    throw new Error('Post not found');
  }
  const postData = postSnap.data() || {};

  const title =
    (postType === 'qa' ? (postData.question || '') : (postData.title || '')) ||
    postData.subject ||
    'Post';
  const subject = postData.subject || '';

  const senderActor = buildActorSnapshot({
    uid: senderId,
    displayName: senderName,
    avatarUrl: senderAvatar,
  });

  const messageData = buildGroupMessageDocument({
    type: 'share',
    text: String(title || 'Shared a post'),
    sender: senderActor,
    sharedPost: {
      type: postType,
      id: postId,
      title: String(title || ''),
      subject: String(subject || ''),
    },
  });

  const msgRef = await addDoc(collection(db, ...groupMessagesPath(groupId)), messageData);

  if (postType === 'qa') {
    try {
      await updateDoc(postRef, {
        shareCount: increment(1),
        updatedAt: serverTimestamp(),
        lastShareAt: serverTimestamp(),
        lastShareById: senderId,
        lastShareByName: senderName,
        lastShareGroupId: groupId,
        lastShareMessageId: msgRef.id,
      });
    } catch (err) {
      console.warn('Failed to increment qa post shareCount', err);
    }
  }

  return msgRef.id;
}

export function subscribeToGroupMessages(groupId, callback) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const q = query(
    collection(db, ...groupMessagesPath(groupId)),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .reverse();

    callback(messages);
  });
}

export function subscribeToLatestGroupMessage(groupId, callback, onError) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!groupId) return () => {};

  const { db } = getFirebaseServices();
  const q = query(
    collection(db, ...groupMessagesPath(groupId)),
    orderBy('timestamp', 'desc'),
    limit(1)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const latest = snapshot.docs[0];
      callback({ id: latest.id, ...latest.data() });
    },
    onError
  );
}

export async function getGroupById(groupId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const docRef = doc(db, ...groupDocPath(groupId));
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  }

  return null;
}

export async function getGroupByPostId(postId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const q = query(
    collection(db, COLLECTIONS.GROUPS),
    where('postId', '==', postId)
  );

  const snapshot = await getDocs(q);
  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    };
  }

  return null;
}

export async function deleteGroupByPostId(postId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const group = await getGroupByPostId(postId);
  if (!group) {
    return;
  }

  const groupId = group.id;

  const messagesSnapshot = await getDocs(
    collection(db, ...groupMessagesPath(groupId))
  );
  for (const messageDoc of messagesSnapshot.docs) {
    await deleteDoc(doc(db, ...groupMessageDocPath(groupId, messageDoc.id)));
  }

  await deleteDoc(doc(db, ...groupDocPath(groupId)));
}

export async function deleteGroupMessage({ groupId, messageId, requesterId, requesterIsAdmin = false }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!groupId) throw new Error('groupId is required');
  if (!messageId) throw new Error('messageId is required');
  if (!requesterId) throw new Error('requesterId is required');

  const { db } = getFirebaseServices();
  const msgRef = doc(db, ...groupMessageDocPath(groupId, messageId));
  const msgSnap = await getDoc(msgRef);

  if (!msgSnap.exists()) {
    throw new Error('Message not found');
  }

  const data = msgSnap.data() || {};
  const isOwnMessage = data.senderId === requesterId;

  if (!requesterIsAdmin && !isOwnMessage) {
    throw new Error('You can only delete your own messages');
  }

  await deleteDoc(msgRef);
}