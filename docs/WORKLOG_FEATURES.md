# 출퇴근 기록부 – 전체 기능 정리

모든 시각·날짜는 **서울(Asia/Seoul)** 기준입니다.

---

## 1. 개요

- **직원(일반 사용자)**: 본인 출퇴근 기록 조회, 출근/퇴근/야근 버튼, 연차 캘린더, 이번 주 요약.
- **관리자**: 오늘 출근 현황, 출퇴근 DB(기간·담당자 필터), 엑셀 내보내기, 연차 승인, 기간 내 기록 삭제.
- **자동 처리**: 00:00 당일 결근 기초 데이터 생성, 18:00·23:00 스케줄러 자동 퇴근/야근 종료(화면 열림과 무관).

---

## 2. 시각 기준 (서울)

| 시각 | 용도 |
|------|------|
| 09:10 | 지각 기준 (이후 출근 시 지각 + 사유 입력) |
| 18:00 | 야근 시작 버튼 노출 기준(퇴근 후 18:00 이후만) · **스케줄러 자동 퇴근** 시각 |
| 23:00 | **스케줄러 야근 자동 종료** 시각 (당일 23:00으로 종료) |
| 00:00 | 당일 결근 기초 데이터 생성 (Cloud Scheduler) |

---

## 3. 데이터 구조

### 3.1 Firestore

- **`workLogs`** (전역 컬렉션)  
  - `userId`, `userDisplayName`, `clockInAt`, `clockOutAt`, `status`, `approvedBy`, `approvedAt`, `tardinessReason`, `overtimeStartAt`, `overtimeEndAt`
- **`users/{uid}/leaveDays/{dateKey}`**  
  - 연차 일자별 문서 (승인 대기/승인)

### 3.2 출근 상태 (status / 표시)

| status | 관리자 표시 | 비고 |
|--------|-------------|------|
| `absent` | 결근 | 00:00에 생성된 당일 초기값, 출근 시 approved로 갱신 |
| `approved` | 정상출근 / 지각 | 주말·공휴일이면 정상출근, 평일 09:10 초과 출근 시 지각 |
| `pending` | 승인 대기 | (레거시) |
| `rejected` | 승인 거부 | (레거시) |

연차는 `workLogs`가 아니라 `leaveDays`로 관리되며, 관리자 테이블에서는 “연차” 행으로 함께 표시됩니다.

---

## 4. 직원 화면 (WorkLogDashboardView)

### 4.1 출근 / 퇴근

- **출근하기**  
  - 당일 연차가 아니고, 당일 로그가 없거나 **결근(absent)** 일 때만 노출.  
  - 09:10 이전 출근 → `createWorkLog` 또는 결근 문서가 있으면 `updateWorkLogToClockIn`(정상).  
  - 09:10 이후 출근 → 지각 사유 모달 후 동일 API(지각).
- **퇴근하기**  
  - 당일 로그가 있고 `status === 'approved'` 이며 `clockOutAt == null` 일 때만 노출.  
  - 클릭 시 `clockOutWorkLog(logId)` (현재 시각으로 퇴근).

### 4.2 자동 퇴근 (스케줄러)

- **18:00 자동 퇴근**  
  - Firebase Scheduled Function `autoClockOutAtSix`가 **매일 18:00(서울)** 에 실행.  
  - 퇴근 미처리(approved, `clockOutAt == null`) 건 중, 출근일 18:00이 이미 지난 건만 해당일 **18:00**으로 설정.  
  - 이미 수동 퇴근된 건(`clockOutAt != null`)은 덮어쓰지 않음. 화면 열림 여부와 무관.

### 4.3 야근

- **야근 시작**  
  - 당일 퇴근(clockOutAt)이 있고, **퇴근 시각이 당일 18:00 이후**인 경우에만 노출.  
  - 클릭 시 `startOvertime(logId)` → `overtimeStartAt = now`.
- **야근 종료**  
  - 야근 시작 후 `overtimeEndAt == null` 이면 “야근 종료” 버튼 노출.  
  - 클릭 시 `endOvertime(logId)` → `overtimeEndAt = now`.  
  - **자동 종료**: Firebase Scheduled Function `autoEndOvertimeAtEleven`이 **매일 23:00(서울)** 에 실행. 미종료 건은 해당일 23:00으로 설정. 수동 종료된 건은 덮어쓰지 않음. 화면 열림 여부와 무관.

### 4.4 오늘 근무 시간 카드

- 로그가 없거나 **결근(absent)** → `0h 0m`, “아직 출근 전입니다”.  
- 출근 처리(approved) 후 퇴근 전 → 경과 시간 + “근무 중”.  
- 퇴근 후 → 총 근무 시간 + “퇴근 완료”.

### 4.5 이번 주 요약

- **총 근무 시간**  
  - 해당 주(월~일) 내 approved + 퇴근 완료된 로그만 합산.  
- **지각**  
  - 해당 주 평일·비공휴일 기준, 지각으로 판정된 출근 횟수.  
  - 공휴일은 `holidays-kr` 연도별 JSON으로 제외.

### 4.6 연차 캘린더

- 월별 캘린더에서 날짜 클릭으로 연차 지정/해제.  
- “연차 요청”으로 관리자에게 승인 요청.  
- 승인된 연차는 캘린더에 “연차(승인)”으로 표시.

---

## 5. 관리자 화면 (WorkLogAdminView)

### 5.1 탭 구성

- **오늘 출근 현황**  
  - 당일(서울) 기준 직원별 상태: 정상출근 / 지각 / 연차 / 결근, 출근 시각, 비고.
- **출퇴근 기록 데이터베이스**  
  - 기간·담당자 필터, 테이블, 엑셀 내보내기, 기간 내 해당 직원 기록 삭제.
- **연차 승인**  
  - 직원이 요청한 연차(대기) 목록, 승인/승인 취소.

### 5.2 데이터베이스 테이블 컬럼

날짜, 직원, 출근 상태, 출근 시간, **퇴근 시간**, **야근 시작**, **야근 종료**, 총 근무 시간, 비고, 지각 사유.

- workLogs + 연차(leaveDays)를 합쳐 한 테이블로 표시.  
- 총 근무 시간은 `clockOutAt - clockInAt` (퇴근이 있을 때만).

### 5.3 엑셀 내보내기

- 선택 기간·필터에 따른 DB 행과 동일한 데이터를 시트로 내보냄.  
- 컬럼: 날짜, 출근상태, 출근시간, 퇴근시간, 야근시작, 야근종료, 총근무시간, 비고, 지각사유.

### 5.4 기간 내 출근 기록 삭제

- 담당자(직원) 선택 + 기간 선택 후, 해당 기간의 해당 직원 workLogs만 삭제.  
- 결근/출근 구분 없이 동일하게 삭제 가능.

---

## 6. 자동화·스케줄

### 6.1 Cloud Functions (서울 기준)

| 시각 | 함수명 | 동작 |
|------|--------|------|
| **00:00** | `ensureTodayAbsentWorkLogs` | 당일 평일·비공휴일이면 일반 사용자(연차 제외)당 결근(absent) workLog 1건 생성. |
| **18:00** | `autoClockOutAtSix` | 퇴근 미처리(approved, `clockOutAt == null`) 건 중 출근일 18:00이 지난 건만 해당일 18:00으로 설정. 이미 수동 퇴근된 건은 덮어쓰지 않음. |
| **23:00** | `autoEndOvertimeAtEleven` | 야근 미종료(`overtimeStartAt` 있음, `overtimeEndAt == null`) 건 중 출근일 23:00이 지난 건만 해당일 23:00으로 설정. 이미 수동 종료된 건은 덮어쓰지 않음. |

- **00:00**  
  - 당일은 처음에 전원 결근으로 쌓이고, 09:10 전 출근 → 정상 / 이후 출근 → 지각 / 연차인 날은 00:00에 생성 안 함 / 미출근 → 결근 유지.

- **클라이언트**: 화면 열림 시 자동 퇴근/야근 종료 로직 없음. 퇴근·야근 종료는 스케줄러 또는 사용자 수동 버튼으로만 처리.

---

## 7. 스크립트·배포

### 7.1 00:00 로직 수동 실행

- **목적**: 스케줄러 없이 “오늘(서울)” 결근 1건 생성만 실행.  
- **조건**: 프로젝트 루트에 `firebase-admin-key.json` (서비스 계정 키).  
- **명령**:  
  ```bash
  npx tsx scripts/run-ensure-absent.ts
  ```  
- 주말/공휴일이면 스킵, 평일이면 일반 사용자당 당일 결근 1건 생성(연차 제외). 이미 당일 workLog가 있는 사용자는 스킵(중복 방지).

### 7.2 Functions 배포

- **명령**: `firebase deploy --only functions`  
- Blaze 요금제 필요.  
- 상세: `docs/FUNCTIONS_DEPLOY.md` 참고.

---

## 8. 관련 파일

| 구분 | 경로 |
|------|------|
| 타입 | `src/types/worklog.ts` |
| 시각 유틸 | `src/lib/datetime-seoul.ts` |
| workLog API | `src/lib/worklog.ts` |
| 공휴일 | `src/lib/kr-holidays.ts` |
| 훅 | `src/hooks/useWorkLog.ts`, `src/hooks/useLeaveDays.ts` |
| 직원 화면 | `src/features/worklog/WorkLogDashboardView.tsx` |
| 관리자 화면 | `src/features/worklog/WorkLogAdminView.tsx` |
| 스케줄러(00:00, 18:00, 23:00) | `functions/src/index.ts` |
| 수동 실행 스크립트 | `scripts/run-ensure-absent.ts` |
| Firestore 규칙 | `firestore.rules` (workLogs 읽기/쓰기/수정/삭제) |

---

## 9. 지각·주말·공휴일

- **지각**: 평일·비공휴일 기준, 출근 시각이 **당일 09:10 초과**일 때.  
- **정상출근**: 주말 또는 공휴일 출근 시, 시각과 관계없이 정상출근으로 표시.  
- **공휴일**: `holidays-kr` CDN 연도별 JSON 사용.  
- 이번 주 지각 횟수는 해당 주에 걸친 연도의 공휴일을 합쳐서 계산.

이 문서는 위 구조와 동작을 기준으로 출퇴근 기록부의 전체 구현 기능을 정리한 것입니다.
