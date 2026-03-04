# Firebase Functions 배포

## 00:00 로직을 지금 한 번 수동 실행

스케줄러 없이 "오늘(서울)" 기준으로 결근 1건 생성 로직만 실행하려면:

1. **서비스 계정 키**: Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → **새 비공개 키 생성** 후, 프로젝트 루트에 `firebase-admin-key.json`으로 저장.
2. **실행**:
   ```bash
   npx tsx scripts/run-ensure-absent.ts
   ```
   - 오늘이 주말/공휴일이면 스킵되고, 평일이면 일반 사용자당 당일 결근 1건 생성(연차인 사람 제외).

---

## 배포 명령

```bash
firebase deploy --only functions
```

(Blaze 요금제 필요)

---

## 배포 중 묻는 문구 해석

### "How many days do you want to keep container images before they're deleted? (1)"

- **의미**: Cloud Build가 함수용 **컨테이너 이미지**를 저장하는데, **몇 일이 지나면 예전 이미지를 삭제할지** 묻는 값입니다.
- **(1)** = 1일이 지나면 이전 이미지를 삭제합니다. 즉, **가장 최근 배포 이미지 1개만 유지**하고 나머지는 정리해 저장 공간을 아끼는 설정입니다.
- **권장**: 기본값 **1** 그대로 두면 됩니다. 예전 버전으로 롤백할 일이 많다면 7~14 정도로 늘릴 수 있습니다.
