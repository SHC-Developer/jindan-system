/**
 * 00:00 스케줄러와 동일한 로직을 지금 시각 기준 "오늘(서울)"에 대해 한 번 실행.
 * 당일이 평일·비공휴일이면 모든 일반 사용자에게 당일 결근 1건 생성(연차 제외).
 *
 * 사용 전: 프로젝트 루트에 firebase-admin-key.json (서비스 계정 키) 필요.
 *
 * 실행:
 *   npx tsx scripts/run-ensure-absent.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TIMEZONE = 'Asia/Seoul';
const HOLIDAYS_CDN = 'https://raw.githubusercontent.com/hyunbinseo/holidays-kr/main/public';

function getTodayKeySeoul(now: Date): string {
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

function getDayOfWeekSeoul(dateKey: string): number {
  const d = new Date(dateKey + 'T12:00:00+09:00');
  return d.getDay();
}

async function getHolidayDateKeys(year: number): Promise<Set<string>> {
  const url = `${HOLIDAYS_CDN}/${year}.json`;
  const res = await fetch(url);
  if (!res.ok) return new Set();
  const data = (await res.json()) as Record<string, unknown>;
  const set = new Set<string>();
  for (const key of Object.keys(data)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) set.add(key);
  }
  return set;
}

async function main() {
  const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');
  let key: ServiceAccount;
  try {
    const raw = readFileSync(keyPath, 'utf-8');
    key = JSON.parse(raw) as ServiceAccount;
  } catch {
    console.error('firebase-admin-key.json 을 읽을 수 없습니다.');
    console.error('Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후');
    console.error('프로젝트 루트에 firebase-admin-key.json 으로 저장하세요.');
    process.exit(1);
  }

  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  const now = new Date();
  const todayKey = getTodayKeySeoul(now);
  console.log('오늘(서울):', todayKey);

  const day = getDayOfWeekSeoul(todayKey);
  if (day === 0 || day === 6) {
    console.log('주말이라 스킵합니다.');
    process.exit(0);
  }

  const year = parseInt(todayKey.slice(0, 4), 10);
  const holidayKeys = await getHolidayDateKeys(year);
  if (holidayKeys.has(todayKey)) {
    console.log('공휴일이라 스킵합니다.');
    process.exit(0);
  }

  const clockInAt = new Date(todayKey + 'T00:00:00+09:00').getTime();
  const startMs = new Date(todayKey + 'T00:00:00+09:00').getTime();
  const endMs = new Date(todayKey + 'T23:59:59.999+09:00').getTime();

  const existingSnap = await db
    .collection('workLogs')
    .where('clockInAt', '>=', startMs)
    .where('clockInAt', '<=', endMs)
    .get();
  const userIdsWithLog = new Set(existingSnap.docs.map((doc) => doc.data().userId as string));

  const usersSnap = await db.collection('users').where('role', '==', 'general').get();
  let created = 0;
  for (const d of usersSnap.docs) {
    const uid = d.id;
    if (userIdsWithLog.has(uid)) continue;
    const displayName = (d.data().displayName as string) ?? null;
    const leaveRef = db.collection('users').doc(uid).collection('leaveDays').doc(todayKey);
    const leaveSnap = await leaveRef.get();
    if (leaveSnap.exists) continue;

    await db.collection('workLogs').add({
      userId: uid,
      userDisplayName: displayName,
      clockInAt,
      clockOutAt: null,
      status: 'absent',
      approvedBy: null,
      approvedAt: null,
      tardinessReason: null,
      overtimeStartAt: null,
      overtimeEndAt: null,
    });
    created++;
    console.log('  결근 생성:', displayName ?? uid);
  }
  console.log('완료. 결근', created, '건 생성.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
