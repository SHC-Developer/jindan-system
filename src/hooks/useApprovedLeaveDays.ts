import { useState, useEffect, useMemo } from 'react';
import { subscribeLeaveDays } from '../lib/leaveDays';
import { useUserList } from './useUserList';
import type { SharedCalendarEvent } from '../types/shared-calendar';

/** 연차 DB에서 읽어온 승인된 연차를 SharedCalendarEvent 형식으로 변환 */
export function useApprovedLeaveDays(): SharedCalendarEvent[] {
  const { users } = useUserList();
  const [leaveByUser, setLeaveByUser] = useState<Map<string, { dateKey: string; type: string }[]>>(new Map());

  useEffect(() => {
    if (users.length === 0) {
      setLeaveByUser(new Map());
      return;
    }
    const unsubs: (() => void)[] = [];
    users.forEach((u) => {
      const unsub = subscribeLeaveDays(
        u.uid,
        (items) => {
          const approved = items.filter((i) => i.status === 'approved');
          setLeaveByUser((prev) => {
            const next = new Map(prev);
            if (approved.length === 0) next.delete(u.uid);
            else next.set(u.uid, approved.map((i) => ({ dateKey: i.dateKey, type: i.type })));
            return next;
          });
        },
        (err) => console.error('leaveDays subscription', u.uid, err)
      );
      unsubs.push(unsub);
    });
    return () => unsubs.forEach((u) => u());
  }, [users.map((u) => u.uid).join(',')]);

  return useMemo(() => {
    const result: SharedCalendarEvent[] = [];
    leaveByUser.forEach((items, userId) => {
      const displayName = users.find((u) => u.uid === userId)?.displayName ?? userId.slice(0, 8);
      items.forEach(({ dateKey, type }) => {
        const typeLabel = type === 'morning_half' ? '오전반차' : type === 'afternoon_half' ? '오후반차' : '연차';
        result.push({
          id: `leave-${userId}-${dateKey}`,
          title: `${displayName} ${typeLabel}`,
          dateKey,
          startDateKey: dateKey,
          endDateKey: dateKey,
          category: 'personal_leave',
          createdBy: userId,
          createdByName: displayName,
          createdAt: 0,
        });
      });
    });
    return result;
  }, [leaveByUser, users]);
}
