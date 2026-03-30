// groupMessageApi.js - Helper functions for group messages
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
import { getFirebaseServices, isFirebaseConfigured } from '../firebase';

/**
 * Create a new group for a tutor post
 * @param {string} postId - The tutor post ID
 * @param {string} postTitle - The tutor post title
 * @param {string} subject - The subject
 * @param {string} ownerId - The owner (creator) of the post
 * @param {string} ownerName - The owner's name
 * @returns {Promise<string>} The created group ID
 */
export async function createGroup(postId, postTitle, subject, ownerId, ownerName) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const groupData = {
    postId,
    name: postTitle,
    subject,
    ownerId,
    ownerName,
    members: [ownerId],
    createdAt: serverTimestamp(),
    memberCount: 1,
  };

  const docRef = await addDoc(collection(db, 'groups'), groupData);
  return docRef.id;
}

/**
 * Add a member to an existing group
 * @param {string} groupId - The group ID
 * @param {string} userId - The user ID to add
 * @param {string} userName - The user's name
 */
export async function addMemberToGroup(groupId, userId, userName) {
  void userName;
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    const members = groupSnap.data()?.members || [];

    // Only add if not already a member
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

/**
 * Remove a member from an existing group
 * @param {string} groupId - The group ID
 * @param {string} userId - The user ID to remove
 */
export async function removeMemberFromGroup(groupId, userId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const groupRef = doc(db, 'groups', groupId);
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

/**
 * Get all groups for a specific user
 * @param {string} userId - The user ID
 * @param {function} callback - Callback function when data changes
 * @returns {function} Unsubscribe function
 */
export function subscribeToUserGroups(userId, callback) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const groups = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // Sort by createdAt (newest first).
      const sorted = groups.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA; // Descending
      });
      console.log('Loaded groups for user', userId, ':', sorted);
      callback(sorted);
    },
    (error) => {
      console.error('Error loading groups:', error);
      // If array-contains isn't supported, fetch all and filter client-side
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('Falling back to client-side filtering');
        const unsubscribe = onSnapshot(
          collection(db, 'groups'),
          (snapshot) => {
            const allGroups = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            const userGroups = allGroups.filter(
              group => group.members && Array.isArray(group.members) && group.members.includes(userId)
            );
            // Sort by createdAt (newest first).
            const sorted = userGroups.sort((a, b) => {
              const timeA = a.createdAt?.toMillis?.() || 0;
              const timeB = b.createdAt?.toMillis?.() || 0;
              return timeB - timeA; // Descending
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

/**
 * Send a message to a group
 * @param {string} groupId - The group ID
 * @param {string} senderId - The sender's user ID
 * @param {string} text - The message text
 */
export async function sendGroupMessage(groupId, senderId, text) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const cleanedText = String(text || '').trim();
  if (!cleanedText) {
    throw new Error('Message cannot be empty');
  }

  const { db } = getFirebaseServices();

  const messageData = {
    type: 'text',
    text: cleanedText,
    senderId,
    timestamp: serverTimestamp(),
  };

  const msgRef = await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);

  return msgRef.id;
}

/**
 * Send a system message to a group (join notification, etc.)
 * @param {string} groupId - The group ID
 * @param {string} text - The message text
 */
export async function sendSystemMessage(groupId, text, sender = null) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const cleanedText = String(text || '').trim();
  if (!cleanedText) {
    throw new Error('Message cannot be empty');
  }

  const { db } = getFirebaseServices();

  const senderId = sender?.senderId || null;

  const messageData = {
    type: 'system',
    text: cleanedText,
    senderId,
    timestamp: serverTimestamp(),
  };

  const msgRef = await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);

  return msgRef.id;
}

/**
 * Send a shared-post message into a group chat.
 * The saved message includes { type: 'share', sharedPost: { type, id, title, subject } }
 * so the UI can navigate to the post detail when clicked.
 */
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

  // Load the post for preview/title
  const postRef = doc(db, postType === 'qa' ? 'qaPosts' : 'tutorPosts', postId);
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

  const messageData = {
    type: 'share',
    text: String(title || 'Shared a post'),
    senderId,
    timestamp: serverTimestamp(),
    sharedPost: {
      type: postType,
      id: postId,
      title: String(title || ''),
      subject: String(subject || ''),
    },
  };

  const msgRef = await addDoc(collection(db, 'groups', groupId, 'messages'), messageData);

  // For Q&A posts, treat "share to group" as a Share action.
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
      // non-fatal
    }
  }

  return msgRef.id;
}

/**
 * Subscribe to messages in a group
 * @param {string} groupId - The group ID
 * @param {function} callback - Callback function when messages change
 * @returns {function} Unsubscribe function
 */
export function subscribeToGroupMessages(groupId, callback) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  const q = query(
    collection(db, 'groups', groupId, 'messages'),
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

/**
 * Subscribe to the latest message in a group.
 * @param {string} groupId - The group ID
 * @param {(message: object | null) => void} callback - Latest message callback
 * @param {(error: Error) => void} [onError] - Error callback
 * @returns {function} Unsubscribe function
 */
export function subscribeToLatestGroupMessage(groupId, callback, onError) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!groupId) return () => {};

  const { db } = getFirebaseServices();
  const q = query(
    collection(db, 'groups', groupId, 'messages'),
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

/**
 * Get a specific group by ID
 * @param {string} groupId - The group ID
 */
export async function getGroupById(groupId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const docRef = doc(db, 'groups', groupId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  }

  return null;
}

/**
 * Get group by postId
 * @param {string} postId - The post ID
 */
export async function getGroupByPostId(postId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();
  const q = query(
    collection(db, 'groups'),
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

/**
 * Delete a group by postId (cascade delete messages subcollection)
 * @param {string} postId - The post ID
 */
export async function deleteGroupByPostId(postId) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  const { db } = getFirebaseServices();

  // Find the group by postId
  const group = await getGroupByPostId(postId);
  if (!group) {
    return; // No group to delete
  }

  const groupId = group.id;

  // Delete all messages in the group's messages subcollection
  const messagesSnapshot = await getDocs(
    collection(db, 'groups', groupId, 'messages')
  );
  for (const messageDoc of messagesSnapshot.docs) {
    await deleteDoc(doc(db, 'groups', groupId, 'messages', messageDoc.id));
  }

  // Delete the group document itself
  await deleteDoc(doc(db, 'groups', groupId));
}

/**
 * Delete a message from a group chat.
 * Sender can delete their own message. Admin can delete any message.
 */
export async function deleteGroupMessage({ groupId, messageId, requesterId, requesterIsAdmin = false }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured');
  }

  if (!groupId) throw new Error('groupId is required');
  if (!messageId) throw new Error('messageId is required');
  if (!requesterId) throw new Error('requesterId is required');

  const { db } = getFirebaseServices();
  const msgRef = doc(db, 'groups', groupId, 'messages', messageId);
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
