import { useState, useEffect } from 'react';
import { subscribeLeaveDays } from '../lib/leaveDays';

/** 본인 연차 날짜(dateKey 집합) 실시간. dateKey = 서울 기준 YYYY-MM-DD */
export function useLeaveDays(userId: string | null): {
  leaveDateKeys: Set<string>;
  loading: boolean;
  error: string | null;
} {
  const [leaveDateKeys, setLeaveDateKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLeaveDateKeys(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeLeaveDays(
      userId,
      (keys) => {
        setLeaveDateKeys(new Set(keys));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  return { leaveDateKeys, loading, error };
}
