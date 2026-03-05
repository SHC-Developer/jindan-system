import { useState, useEffect } from 'react';
import { onSnapshot, query, where, orderBy, limit } from 'firebase/firestore';
import { getDailyJournalsRef } from '../lib/firestore-paths';
import { getDailyJournal, getMyDailyJournalList } from '../lib/dailyJournal';
import type { DailyJournalDoc, DailyJournalListItem } from '../types/dailyJournal';

/** 본인 업무일지 목록 (dateKey 내림차순). 실시간 구독. */
export function useMyDailyJournals(userId: string | null): {
  items: DailyJournalListItem[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<DailyJournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const ref = getDailyJournalsRef();
    const q = query(
      ref,
      where('userId', '==', userId),
      orderBy('dateKey', 'desc'),
      limit(500)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setItems(
          snapshot.docs.map((d) => {
            const data = d.data();
            return { id: d.id, dateKey: (data.dateKey as string) ?? '' };
          })
        );
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '목록을 불러오지 못했습니다.');
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [userId]);

  return { items, loading, error };
}

/** 특정 사용자·날짜 업무일지 1건 (실시간 아님, 1회 로드). */
export function useDailyJournalOnce(
  userId: string | null,
  dateKey: string | null
): {
  journal: DailyJournalDoc | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [journal, setJournal] = useState<DailyJournalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId || !dateKey) {
      setJournal(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const doc = await getDailyJournal(userId, dateKey);
      setJournal(doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId, dateKey]);

  return { journal, loading, error, refetch: load };
}

/** 관리자: 특정 직원의 업무일지 목록 (1회 조회). */
export function useUserDailyJournalList(
  userId: string | null
): {
  items: DailyJournalListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [items, setItems] = useState<DailyJournalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await getMyDailyJournalList(userId, 500);
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : '목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [userId]);

  return { items, loading, error, refetch: load };
}
