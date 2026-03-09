import { useState, useEffect, useCallback } from 'react';
import { getPersonnelRecord } from '../lib/personnel';
import type { PersonnelRecord } from '../types/personnel';

export function usePersonnelRecord(userId: string | null): {
  record: PersonnelRecord | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [record, setRecord] = useState<PersonnelRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = useCallback(async () => {
    if (!userId) {
      setRecord(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getPersonnelRecord(userId);
      setRecord(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '인사기록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  return { record, loading, error, refetch: fetchRecord };
}
