import { useState, useEffect, useCallback } from 'react';
import {
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { getDbInstance } from '../lib/firebase';
import {
  getSharedCalendarEventsRef,
  getSharedCalendarEventRef,
} from '../lib/firestore-paths';
import type {
  SharedCalendarEvent,
  SharedCalendarCategory,
  SharedCalendarRepeatFrequency,
  SharedCalendarMonthlyPattern,
  SharedCalendarYearlyPattern,
} from '../types/shared-calendar';

function parseRepeatFrequency(v: unknown): SharedCalendarRepeatFrequency | undefined {
  if (v === 'none' || v === 'daily' || v === 'weekly' || v === 'monthly' || v === 'yearly') return v;
  return undefined;
}

function parseMonthlyPattern(v: unknown): SharedCalendarMonthlyPattern | undefined {
  if (v === 'day_of_month' || v === 'first_friday') return v;
  return undefined;
}

function parseYearlyPattern(v: unknown): SharedCalendarYearlyPattern | undefined {
  if (v === 'same_date' || v === 'first_friday_of_month') return v;
  return undefined;
}

function dataToEvent(id: string, data: Record<string, unknown>): SharedCalendarEvent {
  const createdAt = data.createdAt;
  const createdMs =
    createdAt != null && typeof (createdAt as Timestamp).toMillis === 'function'
      ? (createdAt as Timestamp).toMillis()
      : typeof createdAt === 'number'
        ? createdAt
        : 0;
  const updatedAt = data.updatedAt;
  const updatedMs =
    updatedAt != null && typeof (updatedAt as Timestamp).toMillis === 'function'
      ? (updatedAt as Timestamp).toMillis()
      : typeof updatedAt === 'number'
        ? updatedAt
        : undefined;
  const category = data.category as SharedCalendarCategory | undefined;
  const validCategory =
    category === 'meeting' || category === 'field' || category === 'education' || category === 'personal_leave'
      ? category
      : undefined;
  const dateKey = (data.dateKey as string) ?? '';
  const startDateKey = (data.startDateKey as string | undefined) ?? dateKey;
  const endDateKey = (data.endDateKey as string | undefined) ?? dateKey;
  return {
    id,
    title: (data.title as string) ?? '',
    dateKey,
    startDateKey,
    endDateKey,
    startTime: (data.startTime as string | undefined) ?? undefined,
    endTime: (data.endTime as string | undefined) ?? undefined,
    description: (data.description as string | undefined) ?? undefined,
    location: (data.location as string | undefined) ?? undefined,
    category: validCategory,
    createdBy: (data.createdBy as string) ?? '',
    createdByName: (data.createdByName as string | undefined) ?? undefined,
    createdAt: createdMs,
    updatedAt: updatedMs,
    sourceLeaveUserId: (data.sourceLeaveUserId as string | undefined) ?? undefined,
    sourceLeaveDateKey: (data.sourceLeaveDateKey as string | undefined) ?? undefined,
    recurrenceSeriesId: (data.recurrenceSeriesId as string | undefined) ?? undefined,
    repeatFrequency: parseRepeatFrequency(data.repeatFrequency),
    monthlyPattern: parseMonthlyPattern(data.monthlyPattern),
    yearlyPattern: parseYearlyPattern(data.yearlyPattern),
  };
}

export interface CreateSharedCalendarEventInput {
  title: string;
  dateKey: string;
  startDateKey?: string;
  endDateKey?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  category?: SharedCalendarCategory;
  createdBy: string;
  createdByName?: string;
  sourceLeaveUserId?: string;
  sourceLeaveDateKey?: string;
  recurrenceSeriesId?: string;
  repeatFrequency?: SharedCalendarRepeatFrequency;
  monthlyPattern?: SharedCalendarMonthlyPattern;
  yearlyPattern?: SharedCalendarYearlyPattern;
}

/** 공유일정 캘린더 일정 목록 실시간 구독 (dateKey 순, 그다음 createdAt 순) */
export function useSharedCalendarEvents(): {
  events: SharedCalendarEvent[];
  loading: boolean;
  error: string | null;
  createEvent: (input: CreateSharedCalendarEventInput) => Promise<string>;
  updateEvent: (
    eventId: string,
    input: Partial<Omit<SharedCalendarEvent, 'id' | 'createdBy' | 'createdAt'>>
  ) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  /** 동일 recurrenceSeriesId + 본인 작성 일정 일괄 삭제 (반복 풀기) */
  deleteEventsBySeriesId: (seriesId: string, createdByUid: string) => Promise<void>;
} {
  const [events, setEvents] = useState<SharedCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = getSharedCalendarEventsRef();
    const q = query(ref, orderBy('dateKey', 'asc'), orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setEvents(
          snapshot.docs.map((d) => dataToEvent(d.id, d.data() as unknown as Record<string, unknown>))
        );
        setLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '공유 일정을 불러오지 못했습니다.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const createEvent = useCallback(
    async (input: CreateSharedCalendarEventInput): Promise<string> => {
      const ref = getSharedCalendarEventsRef();
      const data: Record<string, unknown> = {
        title: input.title,
        dateKey: input.dateKey,
        createdBy: input.createdBy,
        createdAt: serverTimestamp(),
      };
      if (input.startDateKey != null) data.startDateKey = input.startDateKey;
      if (input.endDateKey != null) data.endDateKey = input.endDateKey;
      if (input.startTime != null) data.startTime = input.startTime;
      if (input.endTime != null) data.endTime = input.endTime;
      if (input.description != null) data.description = input.description;
      if (input.location != null) data.location = input.location;
      if (input.category != null) data.category = input.category;
      if (input.createdByName != null) data.createdByName = input.createdByName;
      if (input.sourceLeaveUserId != null) data.sourceLeaveUserId = input.sourceLeaveUserId;
      if (input.sourceLeaveDateKey != null) data.sourceLeaveDateKey = input.sourceLeaveDateKey;
      if (input.recurrenceSeriesId != null) data.recurrenceSeriesId = input.recurrenceSeriesId;
      if (input.repeatFrequency != null && input.repeatFrequency !== 'none') {
        data.repeatFrequency = input.repeatFrequency;
      }
      if (input.monthlyPattern != null) data.monthlyPattern = input.monthlyPattern;
      if (input.yearlyPattern != null) data.yearlyPattern = input.yearlyPattern;
      const docRef = await addDoc(ref, data as DocumentData);
      return docRef.id;
    },
    []
  );

  const updateEvent = useCallback(
    async (
      eventId: string,
      input: Partial<Omit<SharedCalendarEvent, 'id' | 'createdBy' | 'createdAt'>>
    ): Promise<void> => {
      const ref = getSharedCalendarEventRef(eventId);
      const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
      (
        [
          'title',
          'dateKey',
          'startDateKey',
          'endDateKey',
          'startTime',
          'endTime',
          'description',
          'location',
          'category',
          'createdByName',
          'recurrenceSeriesId',
          'repeatFrequency',
          'monthlyPattern',
          'yearlyPattern',
        ] as const
      ).forEach((key) => {
        if (input[key] !== undefined) payload[key] = input[key];
      });
      await updateDoc(ref, payload);
    },
    []
  );

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    const ref = getSharedCalendarEventRef(eventId);
    await deleteDoc(ref);
  }, []);

  const deleteEventsBySeriesId = useCallback(async (seriesId: string, createdByUid: string): Promise<void> => {
    const ref = getSharedCalendarEventsRef();
    const q = query(ref, where('recurrenceSeriesId', '==', seriesId), where('createdBy', '==', createdByUid));
    const snap = await getDocs(q);
    const db = getDbInstance();
    let batch = writeBatch(db);
    let ops = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      ops++;
      if (ops >= 500) {
        await batch.commit();
        batch = writeBatch(db);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }, []);

  return { events, loading, error, createEvent, updateEvent, deleteEvent, deleteEventsBySeriesId };
}
