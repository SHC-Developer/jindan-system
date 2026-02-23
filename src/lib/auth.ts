import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { getAuthInstance, getDbInstance, USERS_COLLECTION } from './firebase';
import type { AppUser, UserRole } from '../types/user';

const DEFAULT_ROLE: UserRole = 'general';

/** Firestore 문서 데이터 → AppUser (공통 변환) */
function dataToAppUser(
  firebaseUser: FirebaseUser,
  data: Record<string, unknown> | undefined
): AppUser {
  const role = (data?.role as UserRole) ?? DEFAULT_ROLE;
  const displayName = (data?.displayName as string | undefined) ?? firebaseUser.displayName ?? null;
  const jobTitle = (data?.jobTitle as string | undefined) ?? null;
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? null,
    displayName,
    jobTitle,
    role,
  };
}

/**
 * Firestore users/{uid} 문서 필드 (영문, 대소문자 정확히 일치해야 함):
 * - role: "admin" | "general"
 * - displayName: string (이름)
 * - jobTitle: string (직급. 예: 대리, 팀장)
 * 한글 필드명(이름, 직급, 역할)은 인식되지 않습니다.
 */
export async function fetchAppUser(firebaseUser: FirebaseUser): Promise<AppUser> {
  const db = getDbInstance();
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  let data: Record<string, unknown> | undefined;
  try {
    const userDoc = await getDocFromServer(userRef);
    data = userDoc.exists() ? userDoc.data() : undefined;
  } catch {
    const userDoc = await getDoc(userRef);
    data = userDoc.exists() ? userDoc.data() : undefined;
  }
  return dataToAppUser(firebaseUser, data);
}

/**
 * users/{uid} 문서 실시간 구독. Firestore에서 이름/직급/역할 수정 시 앱에 자동 반영.
 * 반환된 함수 호출 시 구독 해제.
 */
export function subscribeAppUser(
  firebaseUser: FirebaseUser,
  onUser: (user: AppUser) => void,
  onError?: (message: string) => void
): () => void {
  const db = getDbInstance();
  const userRef = doc(db, USERS_COLLECTION, firebaseUser.uid);
  return onSnapshot(
    userRef,
    (snap) => {
      const data = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
      onUser(dataToAppUser(firebaseUser, data));
    },
    (err) => {
      onError?.(err.message ?? '역할 정보를 불러오지 못했습니다.');
    }
  );
}

export async function signInWithGoogle(): Promise<AppUser> {
  const auth = getAuthInstance();
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  return fetchAppUser(userCredential.user);
}

export async function signOut(): Promise<void> {
  const auth = getAuthInstance();
  await firebaseSignOut(auth);
}
