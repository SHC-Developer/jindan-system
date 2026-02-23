import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer } from 'firebase/firestore';
import { getAuthInstance, getDbInstance, USERS_COLLECTION } from './firebase';
import type { AppUser, UserRole } from '../types/user';

const DEFAULT_ROLE: UserRole = 'general';

/**
 * Firestore users/{uid} 문서 필드 (영문, 대소문자 정확히 일치해야 함):
 * - role: "admin" | "general"
 * - displayName: string (이름)
 * - jobTitle: string (직급. 예: 대리, 팀장)
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
