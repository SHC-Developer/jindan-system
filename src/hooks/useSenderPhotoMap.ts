import { useState, useEffect, useMemo } from 'react';
import { getDoc } from 'firebase/firestore';
import { getUserDocRef } from '../lib/firestore-paths';

/**
 * 채팅 메시지 발신자 uid 목록으로 Firestore users 문서에서 photoURL을 조회해 맵으로 반환.
 * 읽기 시점의 최신 프로필 이미지를 채팅에 표시할 때 사용.
 */
export function useSenderPhotoMap(senderIds: string[]): Record<string, string | null> {
  const uniqueIds = useMemo(() => [...new Set(senderIds)], [senderIds]);
  const [map, setMap] = useState<Record<string, string | null>>({});

  const sortedKey = useMemo(() => uniqueIds.slice().sort().join(','), [uniqueIds]);

  useEffect(() => {
    if (uniqueIds.length === 0) {
      setMap({});
      return;
    }

    let cancelled = false;

    Promise.all(
      uniqueIds.map(async (uid) => {
        const snap = await getDoc(getUserDocRef(uid));
        const photoURL = (snap.exists() ? (snap.data()?.photoURL as string | undefined) : undefined) ?? null;
        return { uid, photoURL };
      })
    ).then((pairs) => {
      if (cancelled) return;
      const next: Record<string, string | null> = {};
      for (const { uid, photoURL } of pairs) {
        next[uid] = photoURL;
      }
      setMap(next);
    });

    return () => {
      cancelled = true;
    };
  }, [sortedKey]);

  return map;
}
