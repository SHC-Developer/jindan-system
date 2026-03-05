export type UserRole = 'admin' | 'general';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  /** 직급 (Firestore users/{uid}.jobTitle). 예: 대리, 팀장 */
  jobTitle: string | null;
  role: UserRole;
  /** 프로필 사진 URL (Firebase Auth photoURL 또는 Storage URL) */
  photoURL: string | null;
}
