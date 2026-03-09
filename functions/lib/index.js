import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const ALLOWED_OFFICE_IPS = ['211.170.156.173'];
initializeApp();
const TIMEZONE = 'Asia/Seoul';
const HOLIDAYS_CDN = 'https://raw.githubusercontent.com/hyunbinseo/holidays-kr/main/public';
function getTodayKeySeoul(now) {
    return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}
function getDayOfWeekSeoul(dateKey) {
    const d = new Date(dateKey + 'T12:00:00+09:00');
    return d.getDay();
}
async function getHolidayDateKeys(year) {
    const url = `${HOLIDAYS_CDN}/${year}.json`;
    const res = await fetch(url);
    if (!res.ok)
        return new Set();
    const data = (await res.json());
    const set = new Set();
    for (const key of Object.keys(data)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key))
            set.add(key);
    }
    return set;
}
function getClientIp(request) {
    const raw = request.rawRequest;
    if (!raw)
        return '';
    const forwarded = raw.headers?.['x-forwarded-for'];
    if (forwarded) {
        const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        return String(first).split(',')[0].trim();
    }
    return raw.ip ?? '';
}
/**
 * 직원 출퇴근 액션 (사무실 IP에서만 허용). Callable.
 */
export const workLogAction = onCall({ region: 'asia-northeast3' }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    }
    const clientIp = getClientIp(request);
    if (!ALLOWED_OFFICE_IPS.includes(clientIp)) {
        throw new HttpsError('failed-precondition', '사무실 네트워크에서만 출퇴근 기록을 할 수 있습니다.');
    }
    const db = getFirestore();
    const uid = request.auth.uid;
    const { action, ...params } = request.data;
    switch (action) {
        case 'createWorkLog': {
            const userId = params.userId;
            const userDisplayName = params.userDisplayName ?? null;
            const tardinessReason = params.tardinessReason ?? null;
            if (userId !== uid)
                throw new HttpsError('permission-denied', '본인만 출근할 수 있습니다.');
            const now = Date.now();
            const todayKey = getTodayKeySeoul(new Date(now));
            const todayStart = new Date(todayKey + 'T00:00:00+09:00').getTime();
            const todayEnd = todayStart + 24 * 60 * 60 * 1000;
            const existing = await db.collection('workLogs')
                .where('userId', '==', userId)
                .where('clockInAt', '>=', todayStart)
                .where('clockInAt', '<', todayEnd)
                .limit(1)
                .get();
            if (!existing.empty) {
                const status = existing.docs[0].data().status;
                if (status !== 'absent') {
                    throw new HttpsError('failed-precondition', '오늘은 이미 출근 기록이 있습니다.');
                }
            }
            const docRef = await db.collection('workLogs').add({
                userId,
                userDisplayName,
                clockInAt: now,
                clockOutAt: null,
                status: 'approved',
                approvedBy: null,
                approvedAt: null,
                tardinessReason,
                overtimeStartAt: null,
                overtimeEndAt: null,
                overtimeReason: null,
            });
            return { id: docRef.id };
        }
        case 'updateWorkLogToClockIn': {
            const logId = params.logId;
            const clockInAtMs = params.clockInAtMs;
            const tardinessReason = params.tardinessReason ?? null;
            const expectedUserId = params.expectedUserId;
            const ref = db.collection('workLogs').doc(logId);
            const docSnap = await ref.get();
            if (!docSnap.exists)
                throw new HttpsError('not-found', '해당 출퇴근 기록을 찾을 수 없습니다.');
            const data = docSnap.data();
            if (expectedUserId != null && data?.userId !== expectedUserId) {
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            }
            if (data?.userId !== uid)
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            await ref.update({
                clockInAt: clockInAtMs,
                status: 'approved',
                approvedBy: null,
                approvedAt: null,
                tardinessReason,
            });
            return {};
        }
        case 'clockOutWorkLog': {
            const logId = params.logId;
            const clockOutAtMs = params.clockOutAtMs ?? Date.now();
            const ref = db.collection('workLogs').doc(logId);
            const docSnap = await ref.get();
            if (!docSnap.exists)
                throw new HttpsError('not-found', '해당 출퇴근 기록을 찾을 수 없습니다.');
            if (docSnap.data()?.userId !== uid) {
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            }
            await ref.update({ clockOutAt: clockOutAtMs });
            return {};
        }
        case 'startOvertime': {
            const logId = params.logId;
            const overtimeReason = params.overtimeReason ?? null;
            const ref = db.collection('workLogs').doc(logId);
            const docSnap = await ref.get();
            if (!docSnap.exists)
                throw new HttpsError('not-found', '해당 출퇴근 기록을 찾을 수 없습니다.');
            if (docSnap.data()?.userId !== uid) {
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            }
            await ref.update({
                overtimeStartAt: Date.now(),
                overtimeReason,
            });
            return {};
        }
        case 'endOvertime': {
            const logId = params.logId;
            const endAtMs = params.endAtMs ?? Date.now();
            const ref = db.collection('workLogs').doc(logId);
            const docSnap = await ref.get();
            if (!docSnap.exists)
                throw new HttpsError('not-found', '해당 출퇴근 기록을 찾을 수 없습니다.');
            if (docSnap.data()?.userId !== uid) {
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            }
            await ref.update({ overtimeEndAt: endAtMs });
            return {};
        }
        case 'createOvertimeOnlyWorkLog': {
            const userId = params.userId;
            const userDisplayName = params.userDisplayName ?? null;
            const overtimeReason = params.overtimeReason ?? '';
            if (userId !== uid)
                throw new HttpsError('permission-denied', '본인만 기록할 수 있습니다.');
            const now = Date.now();
            const docRef = await db.collection('workLogs').add({
                userId,
                userDisplayName,
                clockInAt: now,
                clockOutAt: now,
                status: 'approved',
                approvedBy: null,
                approvedAt: null,
                tardinessReason: null,
                overtimeStartAt: now,
                overtimeEndAt: null,
                overtimeReason,
            });
            return { id: docRef.id };
        }
        case 'updateAbsentToOvertime': {
            const logId = params.logId;
            const overtimeReason = params.overtimeReason ?? '';
            const expectedUserId = params.expectedUserId;
            const ref = db.collection('workLogs').doc(logId);
            const docSnap = await ref.get();
            if (!docSnap.exists)
                throw new HttpsError('not-found', '해당 출퇴근 기록을 찾을 수 없습니다.');
            const data = docSnap.data();
            if (expectedUserId != null && data?.userId !== expectedUserId) {
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            }
            if (data?.userId !== uid)
                throw new HttpsError('permission-denied', '본인의 출퇴근 기록만 수정할 수 있습니다.');
            const now = Date.now();
            await ref.update({
                clockInAt: now,
                clockOutAt: now,
                status: 'approved',
                approvedBy: null,
                approvedAt: null,
                tardinessReason: null,
                overtimeStartAt: now,
                overtimeEndAt: null,
                overtimeReason,
            });
            return {};
        }
        default:
            throw new HttpsError('invalid-argument', '알 수 없는 액션입니다.');
    }
});
/**
 * 매일 00:00(서울)에 실행. 당일이 평일·비공휴일이면,
 * 모든 일반 사용자(role=general)에 대해 당일을 일단 결근으로 1건 생성.
 * (연차인 사람은 제외. 이후 09:10 전 출근 → 정상/이후 출근 → 지각/연차 → 연차/미출근 → 결근으로 클라이언트에서 갱신)
 */
export const ensureTodayAbsentWorkLogs = onSchedule({ schedule: '0 0 * * *', timeZone: 'Asia/Seoul' }, async () => {
    const db = getFirestore();
    const now = new Date();
    const todayKey = getTodayKeySeoul(now);
    const day = getDayOfWeekSeoul(todayKey);
    if (day === 0 || day === 6)
        return;
    const year = parseInt(todayKey.slice(0, 4), 10);
    const holidayKeys = await getHolidayDateKeys(year);
    if (holidayKeys.has(todayKey))
        return;
    const clockInAt = new Date(todayKey + 'T00:00:00+09:00').getTime();
    const usersSnap = await db.collection('users').where('role', '==', 'general').get();
    for (const d of usersSnap.docs) {
        const uid = d.id;
        const displayName = d.data().displayName ?? null;
        const leaveRef = db.collection('users').doc(uid).collection('leaveDays').doc(todayKey);
        const leaveSnap = await leaveRef.get();
        if (leaveSnap.exists)
            continue;
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
});
