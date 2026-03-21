# Firestore backend design (draft)

This doc maps the existing React components to Firebase services, collections, and rules.

## What your frontend currently needs (from components)
- Auth: CreateAccount + SignIn
- Feeds:
  - Tutor feed: list + detail + joiners list (currently mock)
  - Q&A feed: list + detail + comments (currently mock)
- Profile: user info + past posts (currently mock)
- Floating menu:
  - Notifications panel (currently empty)
  - Group message panel (currently mock)
- CreatePost: creates either tutor post or Q&A post; optional image

## Recommended Firebase products
- Firebase Authentication (Email/Password)
- Cloud Firestore (main database)
- Cloud Storage (images)
- Cloud Functions (optional but recommended for "joins", counters, and notifications)

## Collections (minimum viable)

### 1) users/{uid}
Used by: Profile, author display.

Example:
```js
{
  uid: "...",
  email: "student@university.edu",
  displayName: "ABC DEFG",
  username: "abc",
  year: "2nd Year",
  photoURL: null,

  // profile fields (optional for MVP)
  education: {
    year: "2nd Year",
    major: "Computer Science",
    university: "..."
  },
  subjectsToTutor: ["Mathematics"],
  subjectsNeedingHelp: ["Algorithm"],
  role: "Tutor" | "Student" | "Both",
  contact: { discord: "...", line: "..." },
  bio: "...",

  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

### 2) tutorPosts/{postId}
Used by: TutorFeed, TutorPostDetail.

Example:
```js
{
  type: "tutor",
  authorId: "uid",
  authorName: "Display Name",
  authorAvatar: "" | null,

  subject: "Algorithm",
  location: "Engineering Building",
  title: "Help with Dynamic Programming",
  description: "...",
  experience: "...",

  // keep as strings to match your current UI inputs
  date: "2026-03-21",
  time: "14:30",
  hours: 2,

  capacity: 3,
  joinedCount: 1,

  imageUrl: null | "https://...",

  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

Optional subcollection (recommended for correct join behavior):
- tutorPosts/{postId}/joins/{uid}
```js
{ joinedAt: <timestamp>, userName: "..." }
```

### 3) qaPosts/{postId}
Used by: QAFeed, QAPostDetail.

Example:
```js
{
  type: "qa",
  authorId: "uid",
  authorName: "Display Name",

  subject: "Mathematics",
  question: "Can someone explain the concept of limits?",
  description: "(optional)",

  likeCount: 0,
  commentCount: 0,
  shareCount: 0,

  imageUrl: null | "https://...",

  createdAt: <timestamp>,
  updatedAt: <timestamp>
}
```

Recommended subcollection for comments:
- qaPosts/{postId}/comments/{commentId}
```js
{
  authorId: "uid",
  authorName: "...",
  text: "...",
  parentId: null | "commentId", // for replies
  createdAt: <timestamp>
}
```

## Notifications (later)
- users/{uid}/notifications/{notifId}
```js
{ type: "join" | "comment" | "like", read: false, createdAt: <timestamp>, data: {...} }
```

## Group chat (later)
Two common options:
1) One chat per tutor post
- chats/{chatId} { postId, memberIds: [uid...], createdAt }
- chats/{chatId}/messages/{messageId} { authorId, text, createdAt }

2) One chat per “group” concept (if you add groups explicitly)

## Rules strategy (high level)
- Reads: either public or auth-only
- Writes:
  - users: only the owner writes their own doc
  - posts: only signed-in users can create
  - edits/deletes: only the author
  - joins: only the joining user can create their join doc
  - comments: only signed-in users; only author can delete

For exact rules, decide first:
- Should unauthenticated users be able to read feeds?
- Should you restrict email domain (student email only)?

## Cloud Functions / transactions (recommended)
These are the operations that are hard to do safely client-only:
- Joining a tutor post with capacity enforcement
  - Use a transaction to prevent over-capacity
- Maintaining counters (joinedCount/commentCount/likeCount)
- Fan-out notifications (e.g. notify author when someone joins/comments)

If you tell me your intended MVP scope (just posts? joins? comments?), I’ll turn this draft into concrete rules + function specs.
