# Firestore 채팅 경로 및 초기화

## 경로 구조 (A안: 프로젝트×중메뉴당 1채팅)

```
projects (컬렉션)
  └ gyeonggi-bridge-A (문서: name="경기도 교량A")
  └ gyeonggi-bridge-B (문서: name="경기도 교량B")
  └ seoul-tunnel-C    (문서: name="서울시 터널C")
        └ subMenus (서브컬렉션)
              └ quantity-extract  (문서: name="물량표 추출")
              └ photo-album       (문서: name="사진첩 자동")
              └ report-review     (문서: name="보고서 작성 도구 및 검토")
              └ field-survey      (문서: name="현장조사 자료 데이터 정리")
              └ material-test     (문서: name="재료시험 작성 도구")
                    └ messages (서브컬렉션)
                          └ {messageId} (문서)
```

- **메시지 문서 필드**: `senderId`, `senderDisplayName`, `senderJobTitle`, `text`, `createdAt` (Timestamp)

## 초기 구조 생성 (Firebase에 경로/문서 만들기)

프로젝트·중메뉴 문서를 미리 만들어 두려면 터미널에서 다음을 실행하세요.

1. Firebase 콘솔에서 서비스 계정 키를 다운로드해 프로젝트 루트에 `firebase-admin-key.json`으로 저장합니다.
2. 실행:

```bash
npx tsx scripts/init-chat-collections.ts
```

- `projects`에 `gyeonggi-bridge-A`, `gyeonggi-bridge-B`, `seoul-tunnel-C` 문서가 생성됩니다.
- 각 프로젝트 하위에 `subMenus` 문서 5개(`quantity-extract`, `photo-album`, `report-review`, `field-survey`, `material-test`)가 생성됩니다.
- `messages` 서브컬렉션은 앱에서 첫 메시지를 보낼 때 자동으로 생성됩니다.

## 보안 규칙

Firebase 콘솔 → Firestore → 규칙에서, 로그인한 사용자만 채팅 경로를 읽고 쓸 수 있도록 설정하세요. 예:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} { ... }
    match /projects/{projectId}/subMenus/{subMenuId}/messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    match /projects/{projectId} { allow read: if request.auth != null; }
    match /projects/{projectId}/subMenus/{subMenuId} { allow read: if request.auth != null; }
  }
}
```

(기존 `users` 규칙은 그대로 두고, 위 `projects`/`messages` 규칙만 추가하면 됩니다.)
