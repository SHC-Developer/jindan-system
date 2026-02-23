# Firebase 보안 규칙 적용 방법

**"Missing or insufficient permissions"** 가 나오면 Firestore/Storage 규칙이 적용되지 않은 상태입니다. 아래 중 한 가지 방법으로 규칙을 적용하세요.

---

## 방법 1: Firebase 콘솔에서 직접 붙여넣기

### Firestore 규칙

1. [Firebase 콘솔](https://console.firebase.google.com) → 프로젝트 선택
2. **Firestore Database** → **규칙** 탭
3. 아래 내용으로 **전부 교체** 후 **게시**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
    match /projects/{projectId} {
      allow read: if request.auth != null;
      match /subMenus/{subMenuId} {
        allow read: if request.auth != null;
        match /messages/{messageId} {
          allow read, create: if request.auth != null;
          allow update, delete: if false;
        }
      }
    }
  }
}
```

### Storage 규칙 (파일 첨부 사용 시)

1. **Storage** → **규칙** 탭
2. 아래 내용으로 **전부 교체** 후 **게시**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-files/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.resource.size < 100 * 1024 * 1024;
    }
  }
}
```

---

## 방법 2: Firebase CLI로 배포

프로젝트 루트에 `firebase.json`, `firestore.rules`, `storage.rules` 가 있습니다.

1. Firebase CLI 로그인: `firebase login`
2. 배포할 프로젝트가 `.firebaserc` 의 `jindan-system` 이 맞는지 확인. 다르면 `firebase use 프로젝트ID` 로 변경
3. 규칙 배포:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

---

## 규칙 요약

| 경로 | 허용 |
|------|------|
| `users/{uid}` | 로그인한 사용자가 **자기 uid 문서만 읽기** (이름·직급·역할) |
| `projects/.../subMenus/.../messages` | 로그인한 사용자 **읽기·메시지 생성** |
| `chat-files/*` (Storage) | 로그인한 사용자 **읽기·쓰기**, 파일 크기 100MB 미만 |

규칙 적용 후 브라우저를 새로고침하고 다시 로그인해 보세요.
