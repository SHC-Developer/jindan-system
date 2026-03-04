import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();

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

/**
 * 매일 00:00(서울)에 실행. 당일이 평일·비공휴일이면,
 * 모든 일반 사용자(role=general)에 대해 당일을 일단 결근으로 1건 생성.
 * (연차인 사람은 제외. 이후 09:10 전 출근 → 정상/이후 출근 → 지각/연차 → 연차/미출근 → 결근으로 클라이언트에서 갱신)
 */
export const ensureTodayAbsentWorkLogs = onSchedule(
  { schedule: '0 0 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const todayKey = getTodayKeySeoul(now);

    const day = getDayOfWeekSeoul(todayKey);
    if (day === 0 || day === 6) return;

    const year = parseInt(todayKey.slice(0, 4), 10);
    const holidayKeys = await getHolidayDateKeys(year);
    if (holidayKeys.has(todayKey)) return;

    const clockInAt = new Date(todayKey + 'T00:00:00+09:00').getTime();

    const usersSnap = await db.collection('users').where('role', '==', 'general').get();
    for (const d of usersSnap.docs) {
      const uid = d.id;
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
    }
  }
);
