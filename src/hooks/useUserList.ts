import { useState, useEffect } from 'react';
import { getDocs, query, where } from 'firebase/firestore';
import { getUsersRef } from '../lib/firestore-paths';
import type { AppUser } from '../types/user';

interface UserListItem {
  uid: string;
  displayName: string | null;
  jobTitle: string | null;
  email: string | null;
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
    const q = query(usersRef, where('role', '==', 'general'));

    getDocs(q)
      .then((snapshot) => {
        const list: UserListItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: (data.displayName as string) ?? null,
            jobTitle: (data.jobTitle as string) ?? null,
            email: (data.email as string) ?? null,
          };
        });
        setUsers(list);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '직원 목록을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, []);

  return { users, loading, error };
}
