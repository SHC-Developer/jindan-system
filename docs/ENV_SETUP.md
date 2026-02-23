# .env 파일 작성 가이드

프로젝트 **루트 폴더**에 `.env` 파일을 만들고 아래 내용을 채우면 됩니다.

---

## 1. .env 파일 만들기

1. 프로젝트 루트(`package.json`이 있는 폴더)에 새 파일 생성
2. 파일 이름: **`.env`** (맨 앞에 점 있음)
3. 아래 2번에서 복사한 내용을 붙여넣고 저장

---

## 2. Firebase 값 가져오기

1. 브라우저에서 **[Firebase 콘솔](https://console.firebase.google.com/u/0/project/jindan-system/settings/general)** 로 이동
2. 아래로 스크롤해서 **「내 앱」** 섹션 찾기
3. **웹 앱(</> 아이콘)** 이 있으면:
   - 해당 앱 옆 **「구성」** 클릭  
   → `firebaseConfig` 안에 나오는 값들을 복사
4. 웹 앱이 **없으면**:
   - **「앱 추가」** 클릭 → **웹(</>)** 선택  
   - 앱 닉네임 입력(예: `jindan-web`) 후 등록  
   → 나오는 `firebaseConfig` 값 복사

4. 콘솔에 보이는 예시는 이런 형태입니다:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "jindan-system.firebaseapp.com",
  projectId: "jindan-system",
  storageBucket: "jindan-system.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

---

## 3. .env 파일에 넣을 내용

`.env` 파일을 열고 **아래 형식**으로 작성합니다.  
`""` 안에는 Firebase 콘솔에서 복사한 **실제 값**을 넣습니다.

```env
# Firebase (구글 로그인 / Firestore)
VITE_FIREBASE_API_KEY="여기에 콘솔의 apiKey 값"
VITE_FIREBASE_AUTH_DOMAIN="jindan-system.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="jindan-system"
VITE_FIREBASE_STORAGE_BUCKET="jindan-system.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="여기에 messagingSenderId 숫자"
VITE_FIREBASE_APP_ID="여기에 appId 값"
```

- **주의**: `authDomain`, `projectId`, `storageBucket`은 위 예시처럼 `jindan-system` 기준으로 같을 수 있습니다. 콘솔에 나온 그대로 넣으면 됩니다.
- **VITE_** 로 시작하는 이름을 바꾸지 마세요. 그래야 앱에서 읽을 수 있습니다.

---

## 4. 저장 후 확인

- `.env` 파일을 **프로젝트 루트**에 저장했는지 확인
- 개발 서버를 **다시 실행**: 터미널에서 `npm run dev`  
  (이미 켜져 있었으면 한 번 끄고 다시 실행해야 .env를 읽습니다)

---

## 5. 보안 참고

- `.env`는 **절대 GitHub 등에 올리지 마세요.** (이미 `.gitignore`에 포함되어 있음)
- API 키가 노출되면 안 되므로, 공개 저장소에는 `.env.example`만 두고 실제 값은 `.env`에만 넣습니다.
