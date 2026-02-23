/**
 * Firestore 채팅 경로(projects / subMenus) 존재 여부 확인.
 * 프로젝트 루트에서 실행: npx tsx scripts/verify-firestore-structure.ts
 *
 * 사용 전: firebase-admin-key.json 이 프로젝트 루트에 있어야 합니다.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');

async function main() {
  let key: ServiceAccount;
  try {
    const raw = readFileSync(keyPath, 'utf-8');
    key = JSON.parse(raw) as ServiceAccount;
  } catch {
    console.error('firebase-admin-key.json 을 읽을 수 없습니다.');
    process.exit(1);
  }

  initializeApp({ credential: cert(key) });
  const db = getFirestore();

  try {
    const projectsSnap = await db.collection('projects').get();
    if (projectsSnap.empty) {
      console.log('projects 컬렉션: (비어 있음)');
      console.log('  → 채팅 경로를 만들려면: npx tsx scripts/init-chat-collections.ts');
      process.exit(0);
      return;
    }

    console.log('projects 컬렉션: %d개 문서\n', projectsSnap.size);

    for (const projectDoc of projectsSnap.docs) {
      const name = (projectDoc.data() as { name?: string }).name ?? '-';
      console.log('  projects/%s  (name: %s)', projectDoc.id, name);

      const subMenusSnap = await projectDoc.ref.collection('subMenus').get();
      if (subMenusSnap.empty) {
        console.log('    └ subMenus: (비어 있음)');
        continue;
      }

      console.log('    └ subMenus: %d개', subMenusSnap.size);
      for (const menuDoc of subMenusSnap.docs) {
        const menuName = (menuDoc.data() as { name?: string }).name ?? '-';
        const messagesSnap = await menuDoc.ref.collection('messages').limit(1).get();
        const hasMessages = !messagesSnap.empty;
        console.log('       - %s (name: %s)  messages: %s', menuDoc.id, menuName, hasMessages ? '있음' : '없음');
      }
      console.log('');
    }

    console.log('확인 완료. 위 경로가 있으면 채팅/파일 메시지가 저장될 위치입니다.');
  } catch (err) {
    console.error('확인 실패:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
