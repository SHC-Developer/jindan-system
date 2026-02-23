# Firestore users 컬렉션 — 필드 안내

홈페이지에 이름·직급·관리자 여부가 나오려면 **컬렉션 ID**, **문서 ID**, **필드 이름**을 아래와 똑같이 맞춰야 합니다.

---

## ⚠️ 문서 ID = 로그인한 계정의 UID (가장 중요)

앱은 **`users/{로그인한 사용자 UID}`** 문서만 읽습니다.  
필드는 잘 넣었는데 화면에 안 나온다면, **문서 ID**가 그 UID와 다른 경우가 많습니다.

**문서 ID 확인 방법**
1. [Firebase 콘솔 → Authentication → 사용자](https://console.firebase.google.com/project/jindan-system/authentication/users) 탭 이동
2. 지금 로그인에 쓰는 구글 계정 행에서 **UID** 복사 (긴 영문+숫자 문자열)
3. [Firestore → users 컬렉션](https://console.firebase.google.com/project/jindan-system/firestore) 이동
4. **문서 ID가 방금 복사한 UID와 완전히 동일한 문서**를 만들거나 수정
   - 새로 만든다면: "문서 ID" 입력란에 UID를 **그대로 붙여넣기** (자동 생성 사용 금지)

---

## 컬렉션·문서

- **컬렉션 ID**: `users` (소문자)
- **문서 ID**: 위에서 확인한 **Authentication UID** (그대로 사용)

---

## 필드 (영문, 대소문자 일치)

| 필드 이름     | 타입   | 예시 값   | 설명        |
|--------------|--------|-----------|-------------|
| `role`       | string | `"admin"` 또는 `"general"` | 관리자 / 일반 사용자 |
| `displayName`| string | `"홍길동"` | 표시할 이름  |
| `jobTitle`   | string | `"대리"`   | 직급         |

- **⚠️ 한글 필드명 사용 금지**: Firestore에서 "필드 추가" 시 **이름**에 `이름`, **값**에 `홍길동` 이렇게 넣으면 안 됩니다.  
  앱이 읽는 필드 이름은 **반드시** 아래와 같아야 합니다.
  - **이름** → 필드 이름 `displayName` (값: 홍길동)
  - **직급** → 필드 이름 `jobTitle` (값: 대리)
  - **역할** → 필드 이름 `role` (값: admin 또는 general)
- `이름`, `직급`, `역할` 같은 한글 필드명은 인식되지 않습니다.

---

## Firestore에서 설정 예시

1. **Firestore** → `users` 컬렉션 선택
2. 문서 ID를 **해당 사용자 UID**로 추가(또는 기존 UID 문서 선택)
3. 아래 필드 추가/수정:

```
role         (string)  →  admin   또는  general
displayName  (string)  →  홍길동
jobTitle     (string)  →  대리
```

4. 저장 후 앱에서 **자동 반영**됩니다 (새로고침 없이). 반영이 안 되면 브라우저 새로고침(F5) 후 확인하세요.

---

## 반영이 안 될 때

- **필드 이름**이 `displayName`, `jobTitle`, `role` 인지 확인 (대소문자 포함). **한글 필드명(이름, 직급, 역할)은 사용하지 마세요.**
- 문서가 **컬렉션 `users`** 안에 있고, **문서 ID가 해당 사용자의 UID**인지 확인 (Authentication UID와 동일해야 함)
- Firestore 저장 후 페이지 새로고침(F5) 후 다시 확인
