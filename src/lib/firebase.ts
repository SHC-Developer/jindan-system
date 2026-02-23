import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import type { UserRole } from '../types/user';

// 이 프로젝트는 Storage 버킷이 firebasestorage.app 하나뿐임. appspot.com은 없어서 CORS 오류 방지용 치환.
const rawBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '';
const storageBucket =
  typeof rawBucket === 'string' && rawBucket.endsWith('.appspot.com')
    ? rawBucket.replace(/\.appspot\.com$/, '.firebasestorage.app')
    : rawBucket;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function initFirebase(): void {
  if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    throw new Error('Firebase 환경 변수가 설정되지 않았습니다. .env 파일을 확인하세요.');
  }
  if (app) return;
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export function getAuthInstance(): Auth {
  if (!auth) initFirebase();
  return auth!;
}

export function getDbInstance(): Firestore {
  if (!db) initFirebase();
  return db!;
}

export function getStorageInstance(): FirebaseStorage {
  if (!storage) initFirebase();
  return storage!;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
}

export const USERS_COLLECTION = 'users';

export type { UserRole };
