# Firebase Storage CORS 설정 (파일 업로드 오류 해결)

**증상**: `localhost:3001`에서 파일 업로드 시  
`Access to XMLHttpRequest at 'https://firebasestorage.googleapis.com/...' has been blocked by CORS policy`  
또는 `Response to preflight request doesn't pass access control check` 가 나옵니다.

**원인**: Firebase Storage 버킷에 CORS가 설정되지 않아, 브라우저가 로컬 개발 주소(localhost)에서 보내는 요청을 막는 경우입니다.

---

## 추천: Cloud Shell로 CORS 적용 (설치 없음)

**gcloud/gsutil이 설치되어 있지 않아도** 브라우저만 있으면 됩니다.

### 1. Cloud Shell 열기

1. [Google Cloud Console](https://console.cloud.google.com) 접속
2. 상단 검색창 옆 **터미널 아이콘(>_)** 클릭 → **Cloud Shell** 열기
3. 아래쪽에 터미널이 뜨면 프로젝트 선택 프롬프트에서 **jindan-system** 선택 (또는 `gcloud config set project jindan-system` 실행)

### 2. CORS 파일 내용 만들고 적용

Cloud Shell에서 아래를 **한 번에 복사해 붙여넣기** 후 Enter:

```bash
cat > /tmp/cors.json << 'EOF'
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "http://127.0.0.1:5173",
      "https://shc-developer.github.io",
      "http://shc-developer.github.io"
    ],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "Content-Length",
      "User-Agent",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    "maxAgeSeconds": 3600
  }
]
EOF
gsutil cors set /tmp/cors.json gs://jindan-system.firebasestorage.app
```

- 버킷이 `jindan-system.appspot.com` 이면 마지막 줄을 `gs://jindan-system.appspot.com` 로 바꿔서 실행하세요.

### 3. 적용 확인

```bash
gsutil cors get gs://jindan-system.firebasestorage.app
```

`origin`, `method` 등이 출력되면 적용된 것입니다. 브라우저 새로 고침 후 다시 업로드해 보세요.

---

## (참고) 로컬에 Google Cloud SDK 설치 후 사용

로컬 터미널에서 `gcloud`/`gsutil`을 쓰려면 SDK를 설치해야 합니다.

### 1. Google Cloud SDK 설치

- Windows: [Google Cloud SDK 설치](https://cloud.google.com/sdk/docs/install) 후 설치 시 **PATH에 추가** 옵션 선택
- 설치 후 **새 터미널**을 열고 `gcloud init` 실행

### 2. 프로젝트·버킷 확인

- Firebase 콘솔 → **Storage** → 상단에 버킷 이름 표시 (예: `jindan-system.firebasestorage.app`)
- Cloud Shell 또는 로컬 터미널에서:

```bash
gcloud auth login
gcloud config set project jindan-system
```

(프로젝트 ID는 본인 Firebase 프로젝트 ID로 변경)

### 3. CORS 설정 적용

프로젝트 루트에 `storage-cors.json` 파일이 있습니다. **같은 디렉터리에서**:

```bash
gsutil cors set storage-cors.json gs://jindan-system.firebasestorage.app
```

- 에러 메시지에 `jindan-system.firebasestorage.app` 가 보이면 위처럼 사용하면 됩니다.
- 예전 프로젝트는 버킷이 `jindan-system.appspot.com` 일 수 있습니다. 그때는 `gs://jindan-system.appspot.com` 로 실행하세요.

### 4. 적용 확인

```bash
gsutil cors get gs://jindan-system.firebasestorage.app
```

위와 같은 형태로 `origin`, `method` 등이 나오면 적용된 것입니다.

---

## 적용 후

브라우저를 새로 고침한 뒤 다시 파일 업로드를 시도하세요.

**GitHub Pages 배포**: `storage-cors.json`에 `https://shc-developer.github.io` 가 이미 포함되어 있습니다. 이미 CORS를 적용한 적이 있다면, 위 2번 블록 전체를 Cloud Shell에서 **한 번 더** 실행해 주세요. 그러면 배포된 페이지에서도 파일 업로드가 됩니다.
