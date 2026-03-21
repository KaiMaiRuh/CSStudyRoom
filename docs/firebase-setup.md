# Firebase setup (CS StudyRoom)

## 1) Create Firebase project
- Firebase Console → Add project
- Project settings → Add app → Web
- Copy the config values

## 2) Add env vars for Vite
- Copy [.env.example](../.env.example) → `.env.local`
- Fill:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - (optional but recommended) `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`
- Restart dev server

## 3) Enable Authentication
- Build → Authentication → Sign-in method
- Enable **Email/Password**

## 4) Create Firestore Database
- Build → Firestore Database → Create database
- Start in **test mode** only for local dev, then switch to proper rules

### Suggested collections
- `users/{uid}`
- `tutorPosts/{postId}`
- `qaPosts/{postId}`

(Next steps for joins/comments/chat/notifications can be added later.)

## 5) Storage (optional)
- Build → Storage → Get started
- Used for images on posts.

## 6) Security rules (high level)
- Reads can be public or auth-only (choose based on your needs)
- Writes should require auth and restrict edits/deletes to owners

If you want, tell me your university email domain (e.g. `@ku.th`) and whether anonymous users should be able to read feeds — I’ll draft exact Firestore/Storage rules to match.
