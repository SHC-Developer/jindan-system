# Electron 릴리즈 후 검증 절차

GitHub 태그 푸시로 Electron 릴리즈 워크플로가 실행된 뒤, 자동 업데이트가 정상 동작하는지 확인하기 위한 체크리스트입니다.

## 1. GitHub Releases 페이지 확인

- [SHC-Developer/jindan-system Releases](https://github.com/SHC-Developer/jindan-system/releases) 접속
- **Latest** 로 표시되는 정식 릴리즈가 존재하는지 확인
- 해당 릴리즈가 **Draft** 또는 **Pre-release** 가 아닌지 확인

## 2. Release assets 확인

같은 릴리즈 페이지에서 다음 파일이 업로드되어 있는지 확인합니다.

- `latest.yml` — 자동 업데이트 메타데이터 (필수)
- `KDVO 안전진단팀 Setup x.x.x.exe` — NSIS 설치 파일
- `*.exe.blockmap` — 차등 다운로드용 블록맵

이 중 하나라도 없으면 설치된 앱에서 업데이트 확인 시 "최신 GitHub Release 또는 latest.yml을 찾지 못했습니다" 오류가 발생할 수 있습니다.

## 3. 설치된 앱에서 업데이트 동작 확인

이전 버전이 설치된 PC에서:

1. 앱 실행 후 상단에 **"업데이트를 확인하는 중입니다…"** 배너가 잠깐 보이는지 확인
2. 새 버전이 있으면 **"새 버전 x.x.x을(를) 다운로드하는 중입니다…"** → **"업데이트 다운로드 중… n%"** 순으로 표시되는지 확인
3. 다운로드 완료 후 **"새 버전이 준비되었습니다. 재시작하면 설치됩니다."** 배너와 **재시작** 버튼이 보이는지 확인
4. **재시작** 클릭 시 앱이 종료된 뒤 새 버전으로 설치·실행되는지 확인

## 문제 발생 시

- 앱에서 "최신 GitHub Release 또는 latest.yml을 찾지 못했습니다" 가 뜨면: 위 1·2단계를 다시 확인하고, 릴리즈가 정식(**release**)로 생성되었는지, assets가 모두 올라갔는지 확인
- GitHub Actions 의 **Release Electron (Windows)** 워크플로에서 **Verify local release artifacts** / **Verify GitHub Release and assets** 단계 실패 시: 해당 단계 로그를 보고 빌드 산출물 또는 게시 설정을 수정
