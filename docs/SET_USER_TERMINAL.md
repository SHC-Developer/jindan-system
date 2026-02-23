# 터미널로 Firestore 사용자 문서 설정하기

콘솔에서 해도 반영이 안 될 때, **터미널에서 Firebase Admin으로 직접** `users/{UID}` 문서를 쓸 수 있습니다.

---

## 1. 서비스 계정 키 받기 (한 번만)

1. [Firebase 콘솔 → 프로젝트 설정(톱니)](https://console.firebase.google.com/project/jindan-system/settings/general)
2. **서비스 계정** 탭 클릭
3. **새 비공개 키 생성** 버튼 클릭 → JSON 파일 다운로드
4. 다운로드한 파일 이름을 **`firebase-admin-key.json`** 으로 바꾸고,  
   **프로젝트 루트** (`package.json` 있는 폴더)에 저장

이 파일은 `.gitignore`에 들어 있어 Git에는 올라가지 않습니다.

---

## 2. 로그인한 계정의 UID 확인

1. [Authentication → 사용자](https://console.firebase.google.com/project/jindan-system/authentication/users) 탭
2. 지금 로그인에 쓰는 구글 계정(예: Sang Hyeon Park) 행에서 **UID** 복사  
   (길게 나오는 영문+숫자 문자열)

---

## 3. 패키지 설치

프로젝트 루트에서:

```bash
npm install
```

(`firebase-admin`이 devDependency로 들어가 있어 함께 설치됩니다.)

---

## 4. 터미널 명령 실행

**Windows (PowerShell):**

```powershell
npm run set-user -- "여기에UID붙여넣기" "박상현" "대리" admin
```

**예시 (UID가 abc123xyz 일 때):**

```powershell
npm run set-user -- "abc123xyz" "박상현" "대리" admin
```

- **첫 번째 인자**: UID (Authentication에서 복사한 값)
- **두 번째**: 표시 이름 (`displayName`)
- **세 번째**: 직급 (`jobTitle`)
- **네 번째**: `admin` 또는 `general`

일반 사용자로 넣을 때 예:

```powershell
npm run set-user -- "abc123xyz" "홍길동" "팀장" general
```

---

## 5. 한글이 깨질 때 (PowerShell)

PowerShell에서 한글 인자가 깨지면:

- **방법 1**: 먼저 역할만 넣고, 이름·직급은 Firestore 콘솔에서 수정  
  `npm run set-user -- "여기에UID" "Name" "Title" admin`  
  실행 후 Firestore에서 `displayName` / `jobTitle` 만 한글로 수정
- **방법 2**: VS Code 통합 터미널 또는 Git Bash에서 같은 명령 실행

---

## 6. 실행 후

- 터미널에 `OK: Firestore users/... 에 반영했습니다.` 가 나오면 성공입니다.
- **웹 앱에서 로그아웃한 뒤 다시 로그인**하거나, **페이지 새로고침(F5)** 하면 화면에 반영됩니다.

---

## 7. 문제 해결

- **firebase-admin-key.json 을 읽을 수 없습니다**  
  → 파일 이름이 `firebase-admin-key.json` 인지, 프로젝트 **루트**에 있는지 확인하세요.

- **권한 오류**  
  → 다운로드한 JSON이 **jindan-system** 프로젝트의 서비스 계정 키인지 확인하세요.

- **여전히 화면에 안 나옴**  
  → `npm run set-user` 에 넣은 **UID**가 Authentication 사용자 목록의 UID와 **완전히 동일**한지 확인하세요.
