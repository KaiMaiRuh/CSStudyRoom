# Firestore Data Map (Readable Structure)

เอกสารนี้สรุปว่า "ข้อมูลอะไรอยู่ตรงไหน" และ "ใครเป็นเจ้าของข้อมูล" เพื่อให้ดูฐานข้อมูลง่ายขึ้น

## 1) Collection หลัก

| Collection | ใช้เก็บอะไร | เจ้าของข้อมูลหลัก | เขียนโดย |
| --- | --- | --- | --- |
| `users/{uid}` | โปรไฟล์ผู้ใช้ | ผู้ใช้เจ้าของ `uid` | เจ้าของบัญชี / admin (บางฟิลด์) |
| `tutorPosts/{postId}` | โพสต์ติว | ผู้สร้างโพสต์ (`authorId`) | ผู้สร้างโพสต์ |
| `qaPosts/{postId}` | โพสต์ถาม-ตอบ | ผู้สร้างโพสต์ (`authorId`) | ผู้สร้างโพสต์ (+ ระบบนับ like/comment/share) |
| `groups/{groupId}` | กลุ่มแชตของโพสต์ติว | เจ้าของกลุ่ม (`ownerId`) | เจ้าของกลุ่ม / สมาชิก (join-leave) |
| `allowedEmails/{email}` | รายชื่ออีเมลที่สมัครได้ | ระบบ | admin/ระบบ |

## 2) โครงข้อมูลที่ใช้เป็นมาตรฐาน (schemaVersion: 2)

### 2.1 users/{uid}

```json
{
  "uid": "...",
  "email": "...",
  "displayName": "...",
  "username": "...",
  "profile": {
    "displayName": "...",
    "username": "...",
    "year": "...",
    "education": {
      "year": "...",
      "major": "...",
      "university": "..."
    },
    "subjectsToTutor": [],
    "subjectsNeedingHelp": [],
    "role": "...",
    "contactText": "...",
    "bio": "..."
  },
  "meta": {
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

### 2.2 tutorPosts/{postId}

```json
{
  "schemaVersion": 2,
  "type": "tutor",
  "author": {
    "uid": "...",
    "displayName": "...",
    "username": "...",
    "avatarUrl": "...",
    "email": "..."
  },
  "subject": "...",
  "title": "...",
  "description": "...",
  "location": "...",
  "experience": "...",
  "schedule": {
    "date": "YYYY-MM-DD",
    "time": "HH:mm",
    "hours": 2
  },
  "capacity": 5,
  "stats": {
    "joinedCount": 1
  },
  "images": [],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2.3 qaPosts/{postId}

```json
{
  "schemaVersion": 2,
  "type": "qa",
  "author": {
    "uid": "...",
    "displayName": "...",
    "username": "...",
    "avatarUrl": "...",
    "email": "..."
  },
  "subject": "...",
  "question": "...",
  "description": "...",
  "content": {
    "subject": "...",
    "question": "...",
    "description": "..."
  },
  "stats": {
    "likeCount": 0,
    "commentCount": 0,
    "shareCount": 0
  },
  "images": [],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2.4 groups/{groupId}

```json
{
  "schemaVersion": 2,
  "postId": "...",
  "name": "...",
  "subject": "...",
  "owner": {
    "uid": "...",
    "displayName": "...",
    "username": "...",
    "avatarUrl": "..."
  },
  "members": ["uid1", "uid2"],
  "memberCount": 2,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 2.5 groups/{groupId}/messages/{messageId}

```json
{
  "type": "text|system|share",
  "text": "...",
  "sender": {
    "uid": "...",
    "displayName": "...",
    "username": "...",
    "avatarUrl": "..."
  },
  "timestamp": "timestamp",
  "sharedPost": {
    "type": "qa|tutor",
    "id": "...",
    "title": "...",
    "subject": "..."
  }
}
```

## 3) Subcollection รายตัว

- `users/{uid}/visits/{yyyy-mm-dd}`: สถิติการเข้าใช้งานรายวัน
- `users/{uid}/revisions/{revId}`: ประวัติการแก้ไขโปรไฟล์
- `users/{uid}/groupReads/{groupId}`: เวลาที่อ่านแชตล่าสุด
- `users/{uid}/notificationReads/{key}`: เวลาที่อ่าน notification ล่าสุด
- `qaPosts/{postId}/likes/{uid}`: คนที่กดไลก์โพสต์
- `qaPosts/{postId}/comments/{commentId}`: คอมเมนต์ของโพสต์
- `qaPosts/{postId}/revisions/{revId}`: ประวัติแก้ไขโพสต์ Q&A
- `tutorPosts/{postId}/revisions/{revId}`: ประวัติแก้ไขโพสต์ติว

## 4) หมายเหตุความเข้ากันได้

เพื่อไม่ให้ข้อมูลเดิมพัง ระบบยังเขียน/อ่านฟิลด์เดิมบางตัวควบคู่ไปกับฟิลด์ใหม่ เช่น
- `authorId`, `authorName`, `authorUsername`, `authorAvatar`
- `likeCount`, `commentCount`, `shareCount`
- `date`, `time`, `hours`

แนวทางนี้ช่วยให้ migrate ได้ทีละส่วน โดย UI เดิมยังใช้งานได้ระหว่างช่วงปรับโครง.
