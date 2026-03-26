import { useState, useEffect } from 'react';
import { onSnapshot, query, where } from 'firebase/firestore';
import { getUsersRef } from '../lib/firestore-paths';
import type { UserRole } from '../types/user';

/** 직원 목록 항목 (관리자 페이지 등에서 사용). photoURL은 Firestore users 문서 기준으로 실시간 반영됨 */
export interface UserListItem {
  uid: string;
  displayName: string | null;
  jobTitle: string | null;
  email: string | null;
  /** 프로필 이미지 URL. 사용자가 프로필 사진을 변경하면 실시간으로 반영됨 */
  photoURL: string | null;
  /** Firestore users.role — 자동 결근 생성 대상은 general 뿐 (Cloud Functions와 동일) */
  role: UserRole;
  /** Firestore users.specialist */
  isSpecialist: boolean;
}

function parseUserDoc(id: string, data: Record<string, unknown>): UserListItem {
  const roleRaw = data.role as string | undefined;
  const role: UserRole = roleRaw === 'admin' ? 'admin' : 'general';
  const spec = data.specialist;
  const isSpecialist = spec === true || String(spec).toLowerCase() === 'true';
  return {
    uid: id,
    displayName: (data.displayName as string) ?? null,
    jobTitle: (data.jobTitle as string) ?? null,
    email: (data.email as string) ?? null,
    photoURL: (data.photoURL as string) ?? null,
    role,
    isSpecialist,
  };
}

export function useUserList(): {
  users: UserListItem[];
  loading: boolean;
  error: string | null;
} {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const usersRef = getUsersRef();
    const generalQuery = query(usersRef, where('role', '==', 'general'));
    const specialistQuery = query(usersRef, where('specialist', '==', true));

    const seen = new Set<string>();
    const merge = (generalList: UserListItem[], specialistList: UserListItem[]) => {
      seen.clear();
      const list: UserListItem[] = [];
      for (const u of [...generalList, ...specialistList]) {
        if (seen.has(u.uid)) continue;
        seen.add(u.uid);
        list.push(u);
      }
      list.sort((a, b) => (a.displayName ?? a.uid).localeCompare(b.displayName ?? b.uid));
      setUsers(list);
    };

    let generalList: UserListItem[] = [];
    let specialistList: UserListItem[] = [];

    const unsubGeneral = onSnapshot(
      generalQuery,
      (snap) => {
        generalList = snap.docs.map((d) => parseUserDoc(d.id, d.data()));
        merge(generalList, specialistList);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '직원 목록을 불러오지 못했습니다.');
      }
    );
    const unsubSpecialist = onSnapshot(
      specialistQuery,
      (snap) => {
        specialistList = snap.docs.map((d) => parseUserDoc(d.id, d.data()));
        merge(generalList, specialistList);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '직원 목록을 불러오지 못했습니다.');
      }
    );

    setLoading(false);

    return () => {
      unsubGeneral();
      unsubSpecialist();
    };
  }, []);

  return { users, loading, error };
}
