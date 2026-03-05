# 버그 수정 및 개선 사항 보고서

**작성일**: 2026-03-05  
**대상**: 진단 자동화 협업 웹앱 전체 기능

---

## 1. Storage 규칙 수정 (높음)

### 파일: `storage.rules`

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| chat-files delete | `write` 조건에 `request.resource.size` 포함 → delete 시 `request.resource`가 null이므로 삭제 거부 가능 | `read`, `create/update`, `delete` 규칙 분리. delete는 인증만 확인 |
| task-files | 규칙 자체가 없음 → 업무 첨부 파일 업로드/다운로드/삭제 불가 | `task-files/{taskId}/{allPaths=**}` 규칙 신규 추가 (read/create/update/delete) |

---

## 2. 관리자 페이지 라우트 보호 (높음)

### 파일: `src/App.tsx`

**문제**: `/admin` URL을 직접 입력하면 일반 사용자도 AdminPage UI가 노출됨  
**수정**:
- URL `/admin` 진입 시 `canAccessAdmin(user)` 검사 추가. 실패하면 `/general-chat`으로 리다이렉트
- `mainContent`에서 `activeSection === 'admin-page'`일 때도 `canAccessAdmin(user)` 검사 추가

---

## 3. 출퇴근 중복 출근 방지 (높음)

### 파일: `src/lib/worklog.ts`

**문제**: `createWorkLog`가 단순 `addDoc`만 사용하여, 여러 탭/기기에서 동시 출근 시 중복 기록 생성 가능  
**수정**: 출근 기록 생성 전 당일 `userId + clockInAt` 범위로 기존 로그 조회. 이미 출근 기록(absent 제외)이 있으면 `"오늘은 이미 출근 기록이 있습니다."` 에러를 throw

---

## 4. 공지 메시지 중복 표시 수정 (높음)

### 파일: `src/features/general-chat/GeneralChatPage.tsx`, `src/features/cad-chat/CadChatPage.tsx`

**문제**: 공지로 고정된 메시지가 공지 영역과 날짜별 메시지 목록에 동시에 표시됨  
**수정**: `groupedByDate` 계산 시 `pinnedMessageIds`에 포함된 메시지를 제외하도록 필터 추가

---

## 5. 아이콘 컴포넌트 소문자 참조 수정 (높음)

### 파일: `src/features/project-chat/ProjectChatContent.tsx` (567행)

**문제**: `<selectedMenuData.icon size={32} />`에서 소문자 시작 식별자를 JSX 컴포넌트로 사용 → React가 HTML 요소로 해석할 수 있음  
**수정**: `const Icon = selectedMenuData.icon; <Icon size={32} />` 패턴으로 변경

---

## 6. 업무 삭제 시 Storage 파일 정리 (높음)

### 파일: `src/lib/tasks.ts` — `deleteTask()`

**문제**: 업무 삭제 시 Firestore 문서만 삭제하고 `task-files/{taskId}/` 하위 Storage 파일은 고아 상태로 남음  
**수정**: `deleteDoc` 호출 전에 `deleteTaskStorageFilesExcept(taskId, [])` 으로 해당 업무의 모든 첨부 파일을 Storage에서 삭제. 실패해도 문서 삭제는 진행

---

## 7. 업무 상태 전이 검증 (중간)

### 파일: `src/lib/tasks.ts`

| 함수 | 추가된 검증 |
|------|------------|
| `submitTask` | 현재 status가 `pending` 또는 `revision`일 때만 제출 허용 |
| `approveTask` | 현재 status가 `submitted`일 때만 승인 허용 |
| `requestRevision` | 현재 status가 `submitted`일 때만 재검토 요청 허용 |

잘못된 상태에서 호출하면 명확한 에러 메시지를 throw

---

## 8. Firestore tasks 삭제·수정 규칙 확장 (중간)

### 파일: `firestore.rules` — `tasks/{taskId}`

**문제**: UI에서는 관리자/specialist에게 삭제·수정 버튼이 보이나, Firestore 규칙은 `createdBy`만 허용하여 권한 거부 발생  
**수정**: `update`와 `delete` 규칙에 `isAdminOrSpecialist()` 조건 추가. 관리자/specialist는 모든 업무를 수정·삭제 가능

---

## 9. useUserList에 specialist 포함 (중간)

### 파일: `src/hooks/useUserList.ts`

**문제**: `where('role', '==', 'general')`만 조회하여 specialist가 업무 지시 대상·업무일지·출퇴근 관리 목록에서 제외됨  
**수정**: `role == 'general'` 쿼리와 `specialist == true` 쿼리를 병렬 실행 후 합산(중복 제거). specialist도 직원 목록에 포함

---

## 10. 자동 퇴근/야근 종료 반복 호출 방지 (중간)

### 파일: `src/features/worklog/WorkLogDashboardView.tsx`

**문제**: `workLogs`나 `now` 상태가 바뀔 때마다 이미 처리된 로그에 대해 `clockOutWorkLog`/`endOvertime`이 반복 호출됨  
**수정**: `useRef`로 처리 완료된 로그 ID를 Set으로 추적. 이미 처리된 ID는 다시 호출하지 않음

---

## 11. 공지 고정(pin) 동시성 개선 (중간)

### 파일: `src/hooks/usePinnedNotices.ts`

**문제**: `addPinned`/`removePinned`가 로컬 배열 상태 기반으로 `updateDoc`을 호출하여, 여러 사용자가 동시에 pin 추가/제거 시 마지막 쓰기만 반영  
**수정**: Firestore `arrayUnion`/`arrayRemove` 원자적 연산으로 교체. `pinnedMessageIds` 의존성도 제거하여 불필요한 콜백 재생성 방지

---

## 12. 연차 요청 알림에 날짜 정보 추가 (중간)

### 파일: `src/features/worklog/WorkLogDashboardView.tsx`

**문제**: 연차 승인 요청 알림에 날짜 정보가 없어 관리자가 어떤 날짜인지 확인 불가  
**수정**:
- 알림 제목에 날짜 포함: `"연차 승인 요청 (03/10, 03/11)"` 또는 `"연차 승인 요청 (03/10 외 2건)"`
- `leaveDateKey` 필드에 신청 날짜들을 쉼표 구분으로 전달

---

## 13. 알림 ID 로그아웃 시 초기화 (중간)

### 파일: `src/hooks/useNotifications.ts`, `src/hooks/useAuth.ts`

**문제**: `notifiedIdsGlobal`이 모듈 레벨 `Set`이라 로그아웃 후에도 유지. 다른 사용자 로그인 시 이전 사용자의 알림 ID가 잔존하여 알림 토스트 표시 로직에 영향  
**수정**:
- `useNotifications.ts`에 `clearNotifiedIds()` 함수 export 추가
- `useAuth.ts`의 `signOut` 콜백에서 로그아웃 성공 후 `clearNotifiedIds()` 호출

---

## 배포 상태

| 항목 | 상태 |
|------|------|
| `firestore.rules` | 배포 완료 |
| `storage.rules` | 배포 완료 |
| 프론트엔드 코드 | 로컬 수정 완료 (빌드/호스팅 배포는 별도 필요) |

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `storage.rules` | chat-files delete 분리, task-files 규칙 신규 추가 |
| `firestore.rules` | tasks update/delete에 isAdminOrSpecialist() 추가 |
| `src/App.tsx` | /admin 라우트 역할 보호, AdminPage 렌더 조건 추가 |
| `src/lib/tasks.ts` | 상태 전이 검증, deleteTask에 Storage 정리 추가 |
| `src/lib/worklog.ts` | createWorkLog에 당일 중복 출근 방지 로직 추가 |
| `src/hooks/useUserList.ts` | specialist 포함하도록 쿼리 확장 |
| `src/hooks/usePinnedNotices.ts` | arrayUnion/arrayRemove 적용 |
| `src/hooks/useNotifications.ts` | clearNotifiedIds() 함수 추가 |
| `src/hooks/useAuth.ts` | signOut 시 clearNotifiedIds() 호출 |
| `src/features/general-chat/GeneralChatPage.tsx` | 공지 메시지 중복 표시 수정 |
| `src/features/cad-chat/CadChatPage.tsx` | 공지 메시지 중복 표시 수정 |
| `src/features/project-chat/ProjectChatContent.tsx` | 아이콘 컴포넌트 소문자 참조 수정 |
| `src/features/worklog/WorkLogDashboardView.tsx` | 자동 퇴근 반복 방지, 연차 알림 날짜 추가 |

---

## 추가 개선 사항 (2차 작업 — 2026-03-05)

### 14. 채팅 스크롤 UX 개선 (중간)

#### 신규 파일: `src/hooks/useAutoScroll.ts`
#### 수정 파일: `GeneralChatPage.tsx`, `CadChatPage.tsx`, `ProjectChatContent.tsx`

**문제**: 새 메시지가 올 때 무조건 맨 아래로 스크롤되어, 이전 메시지를 읽고 있던 사용자가 스크롤을 잃음  
**수정**:
- `useAutoScroll` 커스텀 훅 생성: 스크롤 위치가 하단 120px 이내일 때만 자동 스크롤
- 사용자가 위쪽에 있을 때 새 메시지가 오면 **"새 메시지"** 배지(ArrowDown + 텍스트)를 표시
- 배지 클릭 시 맨 아래로 스크롤, 스크롤 바닥 도달 시 배지 자동 해제

---

### 15. 코드 분할 — React.lazy / Suspense (중간)

#### 수정 파일: `src/App.tsx`

**수정**:
- 11개 주요 페이지 컴포넌트(`AdminPage`, `WorkAssignAdminView`, `WorkAssignMyListView`, `TaskDetailPage`, `WorkLogDashboardView`, `WorkLogAdminView`, `DailyJournalWriteView`, `DailyJournalAdminView`, `ProjectChatContent`, `GeneralChatPage`, `CadChatPage`)를 `React.lazy`로 변경
- 각 렌더 경로에 `<Suspense fallback={<PageFallback />}>` 래퍼 추가 (로딩 스피너 표시)
- 초기 번들 크기 감소, 라우트 전환 시 필요한 코드만 동적 로드

---

### 16. 사이드바 모바일 접기/펼치기 (중간)

#### 수정 파일: `src/types/layout.ts`, `src/components/layout/Sidebar.tsx`, `src/App.tsx`, `GeneralChatPage.tsx`, `CadChatPage.tsx`

**수정**:
- `SidebarProps`에 `isMobileOpen`, `onCloseMobile`, `onOpenMobile` 프로퍼티 추가
- Sidebar 컴포넌트를 **모바일에서 fixed overlay**로 변경 (`translate-x` + `transition`)
- 데스크톱(md 이상)에서는 기존과 동일하게 `relative` 고정 표시
- 오버레이 백드롭 클릭 시 사이드바 닫기
- 메인 레이아웃 및 채팅 페이지 헤더에 햄버거(Menu) 아이콘 버튼 추가 (md:hidden)
- 사이드바 내 메뉴 클릭 시 `closeMobile()` 호출하여 자동 닫기

---

### 17. 대량 메시지 최적화 — 메시지 제한 + 더 불러오기 (중간)

#### 수정 파일: `src/hooks/useChat.ts`, `GeneralChatPage.tsx`, `CadChatPage.tsx`, `ProjectChatContent.tsx`

**수정**:
- `useChat` 훅에 `limitToLast(100)` 적용하여 초기에 최근 100개 메시지만 로드
- `hasMore` 플래그와 `loadMore()` 함수 추가 (100개씩 추가 로드)
- 채널(프로젝트/서브메뉴) 전환 시 자동으로 제한 초기화
- 각 채팅 페이지에 **"이전 메시지 더 불러오기"** 버튼 추가 (메시지 목록 상단)

---

### 18. 업무일지 날짜 전환 시 로딩 UI (낮음)

#### 수정 파일: `src/features/daily-journal/DailyJournalWriteView.tsx`

**문제**: 날짜를 전환할 때 이전 날짜 데이터가 잔시 표시된 후 새 데이터로 교체됨  
**수정**:
- `docLoading` 동안 기존 데이터를 업데이트하지 않도록 `useEffect` 조건 추가
- 본문 렌더링 전 `docLoading` 상태일 때 로딩 스피너 전체 화면 표시
- 데이터 로드 완료 후 정상 폼 렌더

---

### 19. 에러 핸들링 일관 적용 — GlobalToast (중간)

#### 신규 파일: `src/components/GlobalToast.tsx`, `src/hooks/useErrorToast.ts`
#### 수정 파일: `src/types/toast.ts`, `src/App.tsx`, `WorkLogDashboardView.tsx`, `WorkLogAdminView.tsx`

**수정**:
- `ToastItem`에 `variant` 필드 추가 (`'info' | 'success' | 'error'`)
- `GlobalToastContainer` 컴포넌트 생성: 에러/성공 토스트를 화면 우상단에 5초간 표시
- `useErrorToast()` 편의 훅 생성: `showError(title, error?)`, `showSuccess(title, message?)` 제공
- 출퇴근 기록부 주요 기능(출근/퇴근/야근 시작·종료/연차 신청/승인/삭제)의 `console.error`를 `showError()` 토스트로 교체
- App.tsx의 모든 레이아웃 경로에 `<GlobalToastContainer />` 배치

---

## 변경 파일 목록 (2차 추가분)

| 파일 | 변경 내용 |
|------|----------|
| `src/hooks/useAutoScroll.ts` | 신규 — 채팅 자동 스크롤 제어 훅 |
| `src/hooks/useErrorToast.ts` | 신규 — 에러/성공 토스트 편의 훅 |
| `src/components/GlobalToast.tsx` | 신규 — 범용 에러/성공 토스트 UI |
| `src/types/toast.ts` | variant 필드 추가 |
| `src/types/layout.ts` | isMobileOpen, onCloseMobile, onOpenMobile 추가 |
| `src/App.tsx` | React.lazy 코드 분할, Suspense, 모바일 사이드바 상태, 햄버거 버튼, GlobalToast |
| `src/components/layout/Sidebar.tsx` | 모바일 오버레이 토글, 메뉴 클릭 시 자동 닫기 |
| `src/hooks/useChat.ts` | limitToLast 메시지 제한, hasMore/loadMore 추가 |
| `src/features/general-chat/GeneralChatPage.tsx` | useAutoScroll 적용, 새 메시지 배지, 모바일 메뉴, 메시지 더 불러오기 |
| `src/features/cad-chat/CadChatPage.tsx` | useAutoScroll 적용, 새 메시지 배지, 모바일 메뉴, 메시지 더 불러오기 |
| `src/features/project-chat/ProjectChatContent.tsx` | useAutoScroll 적용, 새 메시지 배지, 메시지 더 불러오기 |
| `src/features/daily-journal/DailyJournalWriteView.tsx` | 날짜 전환 로딩 UI 추가 |
| `src/features/worklog/WorkLogDashboardView.tsx` | console.error → showError 토스트 |
| `src/features/worklog/WorkLogAdminView.tsx` | console.error → showError 토스트 |
