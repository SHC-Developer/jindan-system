/**
 * Firestore users/{uid} 문서를 터미널에서 직접 설정하는 스크립트.
 *
 * 사용 전: Firebase 콘솔에서 서비스 계정 키를 다운로드해
 *         프로젝트 루트에 firebase-admin-key.json 으로 저장하세요.
 *
 * 실행 예:
 *   npx tsx scripts/set-user-firestore.ts <UID> "박상현" "대리" admin
 *   npx tsx scripts/set-user-firestore.ts <UID> "홍길동" "팀장" general
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');

function main() {
  const [uid, displayName, jobTitle, role] = process.argv.slice(2);

  if (!uid || !displayName || !jobTitle || !role) {
    console.error('사용법: npx tsx scripts/set-user-firestore.ts <UID> "이름" "직급" admin|general');
    console.error('예: npx tsx scripts/set-user-firestore.ts abc123 "박상현" "대리" admin');
    process.exit(1);
  }

  if (role !== 'admin' && role !== 'general') {
    console.error('role은 반드시 admin 또는 general 이어야 합니다.');
    process.exit(1);
  }

  let key: ServiceAccount;
  try {
    const raw = readFileSync(keyPath, 'utf-8');
    key = JSON.parse(raw) as ServiceAccount;
  } catch (e) {
    console.error('firebase-admin-key.json 을 읽을 수 없습니다.');
    console.error('Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후');
    console.error('프로젝트 루트에 firebase-admin-key.json 으로 저장하세요.');
    process.exit(1);
  }

  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  const docRef = db.collection('users').doc(uid);
  docRef
    .set({ displayName, jobTitle, role }, { merge: true })
    .then(() => {
      console.log('OK: Firestore users/%s 에 반영했습니다.', uid);
      console.log('  displayName:', displayName);
      console.log('  jobTitle:', jobTitle);
      console.log('  role:', role);
      process.exit(0);
    })
    .catch((err: Error) => {
      console.error('Firestore 쓰기 실패:', err.message);
      process.exit(1);
    });
}

main();
