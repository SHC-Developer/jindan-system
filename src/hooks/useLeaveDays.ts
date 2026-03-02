import { useState, useEffect, useMemo } from 'react';
import { subscribeLeaveDays } from '../lib/leaveDays';

/** 본인 연차 날짜 실시간. dateKey 집합 + 승인된 연차 집합(클릭 해제 불가) */
export function useLeaveDays(userId: string | null): {
  leaveDateKeys: Set<string>;
  approvedDateKeys: Set<string>;
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<{ dateKey: string; status: 'pending' | 'approved' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeLeaveDays(
      userId,
      (list) => {
        setItems(list);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  const { leaveDateKeys, approvedDateKeys } = useMemo(() => {
    const all = new Set<string>();
    const approved = new Set<string>();
    items.forEach(({ dateKey, status }) => {
      all.add(dateKey);
      if (status === 'approved') approved.add(dateKey);
    });
    return { leaveDateKeys: all, approvedDateKeys: approved };
  }, [items]);

  return { leaveDateKeys, approvedDateKeys, loading, error };
}
