# GitHub Pages 배포 시 환경 변수 설정

GitHub Pages는 빌드 시점에 환경 변수가 필요합니다. `.env` 파일은 Git에 올리지 않으므로, **Repository Secrets**에 값을 넣어 두고 Actions에서 사용합니다.

## 1. Secrets 추가 방법

1. GitHub 저장소 페이지에서 **Settings** 탭 이동
2. 왼쪽 메뉴 **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼으로 아래 6개를 **이름 그대로** 추가 (Value는 로컬 `.env`에서 복사)

| Name (정확히 이렇게) | Value (로컬 .env 값) |
|----------------------|----------------------|
| `VITE_FIREBASE_API_KEY` | Firebase config의 apiKey |
| `VITE_FIREBASE_AUTH_DOMAIN` | 예: `jindan-system.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | 예: `jindan-system` |
| `VITE_FIREBASE_STORAGE_BUCKET` | 예: `jindan-system.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 숫자 (messagingSenderId) |
| `VITE_FIREBASE_APP_ID` | Firebase config의 appId |

## 2. 확인

- Secrets는 한 번 저장하면 값은 다시 볼 수 없습니다. 잘못 넣었으면 삭제 후 같은 이름으로 다시 추가하세요.
- **이름은 대소문자 포함 정확히** 위 표와 같아야 합니다. 띄어쓰기나 오타가 있으면 빌드에 반영되지 않습니다.
- **Value에는 따옴표를 넣지 마세요.** 값만 입력합니다.
- `master` 브랜치에 푸시하면 자동으로 빌드·배포됩니다. **Actions** 탭에서 워크플로를 열고 **Check Firebase secrets** 단계가 성공했는지 보세요. 여기서 실패하면 "다음 Repository Secret이 비어 있거나 없습니다" 메시지로 어떤 이름이 빠졌는지 확인할 수 있습니다.

## 3. 참고

- `.github/workflows/deploy.yml`의 Build 단계에서 위 변수들을 사용합니다.
- Gemini API를 쓰는 경우 `GEMINI_API_KEY` Secret도 추가할 수 있습니다 (워크플로에 포함되어 있음).
