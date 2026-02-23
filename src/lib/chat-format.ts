import type { Timestamp } from 'firebase/firestore';

function toSafeDate(ts: Timestamp | null | undefined): Date {
  if (ts && typeof ts.toDate === 'function') return ts.toDate();
  return new Date();
}

/** 메시지 날짜 라벨: 오늘 / 어제 / 2025.02.22 */
export function formatChatDateLabel(ts: Timestamp | null | undefined): string {
  const d = toSafeDate(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return '오늘';
  if (sameDay(d, yesterday)) return '어제';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 메시지 시각: 오전 10:30 / 오후 3:05 */
export function formatChatTime(ts: Timestamp | null | undefined): string {
  const d = toSafeDate(ts);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours < 12 ? '오전' : '오후';
  const h = hours % 12 || 12;
  const m = String(minutes).padStart(2, '0');
  return `${ampm} ${h}:${m}`;
}
