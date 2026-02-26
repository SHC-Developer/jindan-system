import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import { getPinnedRef } from '../lib/firestore-paths';

interface UsePinnedNoticesOptions {
  projectId: string;
  subMenuId: string;
}

interface UsePinnedNoticesResult {
  pinnedMessageIds: string[];
  addPinned: (messageId: string) => Promise<void>;
  removePinned: (messageId: string) => Promise<void>;
  loading: boolean;
}

export function usePinnedNotices({
  projectId,
  subMenuId,
}: UsePinnedNoticesOptions): UsePinnedNoticesResult {
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !subMenuId) {
      setPinnedMessageIds([]);
      setLoading(false);
      return;
    }
    const pinnedRef = getPinnedRef(projectId, subMenuId);
    const unsub = onSnapshot(
      pinnedRef,
      (snap) => {
        const data = snap.data();
        const ids = Array.isArray(data?.pinnedMessageIds) ? data.pinnedMessageIds : [];
        setPinnedMessageIds(ids);
        setLoading(false);
      },
      () => {
        setPinnedMessageIds([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [projectId, subMenuId]);

  const addPinned = useCallback(
    async (messageId: string) => {
      const pinnedRef = getPinnedRef(projectId, subMenuId);
      const next = pinnedMessageIds.includes(messageId) ? pinnedMessageIds : [...pinnedMessageIds, messageId];
      try {
        await updateDoc(pinnedRef, { pinnedMessageIds: next });
      } catch {
        await setDoc(pinnedRef, { pinnedMessageIds: [messageId] }, { merge: true });
      }
    },
    [projectId, subMenuId, pinnedMessageIds]
  );

  const removePinned = useCallback(
    async (messageId: string) => {
      const pinnedRef = getPinnedRef(projectId, subMenuId);
      const next = pinnedMessageIds.filter((id) => id !== messageId);
      try {
        await updateDoc(pinnedRef, { pinnedMessageIds: next });
      } catch {
        await setDoc(pinnedRef, { pinnedMessageIds: next }, { merge: true });
      }
    },
    [projectId, subMenuId, pinnedMessageIds]
  );

  return {
    pinnedMessageIds,
    addPinned,
    removePinned,
    loading,
  };
}
