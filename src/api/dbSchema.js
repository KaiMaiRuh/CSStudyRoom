export const COLLECTIONS = Object.freeze({
  USERS: 'users',
  ALLOWED_EMAILS: 'allowedEmails',
  TUTOR_POSTS: 'tutorPosts',
  QA_POSTS: 'qaPosts',
  GROUPS: 'groups',
});

export const SUBCOLLECTIONS = Object.freeze({
  VISITS: 'visits',
  REVISIONS: 'revisions',
  GROUP_READS: 'groupReads',
  NOTIFICATION_READS: 'notificationReads',
  LIKES: 'likes',
  COMMENTS: 'comments',
  MESSAGES: 'messages',
});

function asId(value) {
  return String(value ?? '').trim();
}

export function userDocPath(uid) {
  return [COLLECTIONS.USERS, asId(uid)];
}

export function allowedEmailDocPath(email) {
  return [COLLECTIONS.ALLOWED_EMAILS, asId(email)];
}

export function userVisitsPath(uid) {
  return [...userDocPath(uid), SUBCOLLECTIONS.VISITS];
}

export function userVisitDocPath(uid, visitId) {
  return [...userVisitsPath(uid), asId(visitId)];
}

export function userRevisionsPath(uid) {
  return [...userDocPath(uid), SUBCOLLECTIONS.REVISIONS];
}

export function userGroupReadsPath(uid) {
  return [...userDocPath(uid), SUBCOLLECTIONS.GROUP_READS];
}

export function userGroupReadDocPath(uid, groupId) {
  return [...userGroupReadsPath(uid), asId(groupId)];
}

export function userNotificationReadsPath(uid) {
  return [...userDocPath(uid), SUBCOLLECTIONS.NOTIFICATION_READS];
}

export function userNotificationReadDocPath(uid, key) {
  return [...userNotificationReadsPath(uid), asId(key)];
}

export function tutorPostDocPath(postId) {
  return [COLLECTIONS.TUTOR_POSTS, asId(postId)];
}

export function tutorPostRevisionsPath(postId) {
  return [...tutorPostDocPath(postId), SUBCOLLECTIONS.REVISIONS];
}

export function qaPostDocPath(postId) {
  return [COLLECTIONS.QA_POSTS, asId(postId)];
}

export function qaPostLikesPath(postId) {
  return [...qaPostDocPath(postId), SUBCOLLECTIONS.LIKES];
}

export function qaPostLikeDocPath(postId, uid) {
  return [...qaPostLikesPath(postId), asId(uid)];
}

export function qaPostCommentsPath(postId) {
  return [...qaPostDocPath(postId), SUBCOLLECTIONS.COMMENTS];
}

export function qaPostCommentDocPath(postId, commentId) {
  return [...qaPostCommentsPath(postId), asId(commentId)];
}

export function qaPostRevisionsPath(postId) {
  return [...qaPostDocPath(postId), SUBCOLLECTIONS.REVISIONS];
}

export function groupDocPath(groupId) {
  return [COLLECTIONS.GROUPS, asId(groupId)];
}

export function groupMessagesPath(groupId) {
  return [...groupDocPath(groupId), SUBCOLLECTIONS.MESSAGES];
}

export function groupMessageDocPath(groupId, messageId) {
  return [...groupMessagesPath(groupId), asId(messageId)];
}
