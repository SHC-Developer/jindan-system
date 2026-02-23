/**
 * Firestore 채팅 경로 초기화: projects 문서 및 각 프로젝트 하위 subMenus 문서 생성.
 * messages 서브컬렉션은 첫 메시지 전송 시 자동 생성됩니다.
 *
 * 사용 전: Firebase 콘솔에서 서비스 계정 키를 다운로드해
 *         프로젝트 루트에 firebase-admin-key.json 으로 저장하세요.
 *
 * 실행: npx tsx scripts/init-chat-collections.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');

const PROJECTS: { id: string; name: string }[] = [
  { id: 'gyeonggi-bridge-A', name: '경기도 교량A' },
  { id: 'gyeonggi-bridge-B', name: '경기도 교량B' },
  { id: 'seoul-tunnel-C', name: '서울시 터널C' },
];

const SUBMENUS: { id: string; name: string }[] = [
  { id: 'quantity-extract', name: '물량표 추출' },
  { id: 'photo-album', name: '사진첩 자동' },
  { id: 'report-review', name: '보고서 작성 도구 및 검토' },
  { id: 'field-survey', name: '현장조사 자료 데이터 정리' },
  { id: 'material-test', name: '재료시험 작성 도구' },
];

async function main() {
  let key: ServiceAccount;
  try {
    const raw = readFileSync(keyPath, 'utf-8');
    key = JSON.parse(raw) as ServiceAccount;
  } catch {
    console.error('firebase-admin-key.json 을 읽을 수 없습니다.');
    console.error('Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 후');
    console.error('프로젝트 루트에 firebase-admin-key.json 으로 저장하세요.');
    process.exit(1);
  }

  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  try {
    for (const project of PROJECTS) {
      await db.collection('projects').doc(project.id).set({ name: project.name }, { merge: true });
      console.log('OK: projects/%s', project.id);

      for (const menu of SUBMENUS) {
        const subRef = db
          .collection('projects')
          .doc(project.id)
          .collection('subMenus')
          .doc(menu.id);
        await subRef.set({ name: menu.name }, { merge: true });
        console.log('OK: projects/%s/subMenus/%s', project.id, menu.id);
      }
    }
    console.log('\n채팅 경로 초기화 완료. projects/{id}/subMenus/{id}/messages 에 메시지 전송 시 서브컬렉션이 생성됩니다.');
    process.exit(0);
  } catch (err) {
    console.error('초기화 실패:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
