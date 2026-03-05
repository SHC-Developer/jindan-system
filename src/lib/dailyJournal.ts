import {
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
} from 'firebase/firestore';
import { getDailyJournalsRef, getDailyJournalRef } from './firestore-paths';
import type { DailyJournalDoc, DailyJournalGoal, DailyJournalListItem } from '../types/dailyJournal';

function dataToDoc(id: string, data: DocumentData): DailyJournalDoc {
  const goals = (data.goals as { text: string; checked: boolean }[] | undefined) ?? [];
  return {
    id,
    userId: (data.userId as string) ?? '',
    dateKey: (data.dateKey as string) ?? '',
    goals: goals.map((g) => ({ text: g.text ?? '', checked: !!g.checked })),
    detailContent: (data.detailContent as string) ?? '',
    tomorrowPlan: (data.tomorrowPlan as string) ?? '',
    memo: (data.memo as string) ?? '',
    createdAt: (data.createdAt as number) ?? 0,
    updatedAt: (data.updatedAt as number) ?? 0,
  };
}

export interface SaveDailyJournalInput {
  userId: string;
  dateKey: string;
  goals: DailyJournalGoal[];
  detailContent: string;
  tomorrowPlan: string;
  memo: string;
}

export async function saveDailyJournal(input: SaveDailyJournalInput): Promise<void> {
  const ref = getDailyJournalRef(input.userId, input.dateKey);
  const now = Date.now();
  await setDoc(ref, {
    userId: input.userId,
    dateKey: input.dateKey,
    goals: input.goals,
    detailContent: input.detailContent,
    tomorrowPlan: input.tomorrowPlan,
    memo: input.memo,
    updatedAt: now,
    createdAt: (await getDoc(ref)).data()?.createdAt ?? now,
  });
}

export async function getDailyJournal(
  userId: string,
  dateKey: string
): Promise<DailyJournalDoc | null> {
  const ref = getDailyJournalRef(userId, dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return dataToDoc(snap.id, snap.data());
}

export async function getMyDailyJournalList(
  userId: string,
  maxItems?: number
): Promise<DailyJournalListItem[]> {
  const ref = getDailyJournalsRef();
  let q = query(
    ref,
    where('userId', '==', userId),
    orderBy('dateKey', 'desc')
  );
  if (typeof maxItems === 'number') q = query(q, limit(maxItems));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return { id: d.id, dateKey: (data.dateKey as string) ?? '' };
  });
}
