/**
 * Firebase Storage 버킷에 CORS 설정 적용 (로컬 터미널에서 실행)
 * 사용 전: firebase-admin-key.json 이 프로젝트 루트에 있어야 함.
 *
 * 실행: npx tsx scripts/set-storage-cors.ts
 * 버킷 지정: npx tsx scripts/set-storage-cors.ts gs://버킷이름
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Storage } from '@google-cloud/storage';

const keyPath = resolve(process.cwd(), 'firebase-admin-key.json');
const corsPath = resolve(process.cwd(), 'storage-cors.json');

async function main() {
  let keyContent: string;
  try {
    keyContent = readFileSync(keyPath, 'utf-8');
  } catch {
    console.error('firebase-admin-key.json 을 읽을 수 없습니다.');
    process.exit(1);
  }

  let cors: unknown;
  try {
    cors = JSON.parse(readFileSync(corsPath, 'utf-8'));
  } catch {
    console.error('storage-cors.json 을 읽을 수 없습니다.');
    process.exit(1);
  }

  const key = JSON.parse(keyContent) as { project_id?: string; client_email?: string; private_key?: string };
  const storage = new Storage({
    projectId: key.project_id,
    credentials: key,
  });

  let bucketName: string | null = process.argv[2]?.replace(/^gs:\/\//, '') ?? null;
  if (!bucketName) {
    const envPath = resolve(process.cwd(), '.env');
    try {
      const env = readFileSync(envPath, 'utf-8');
      const m = env.match(/VITE_FIREBASE_STORAGE_BUCKET=["']?([^"'\s]+)/);
      if (m?.[1]) bucketName = m[1].trim();
    } catch {
      // ignore
    }
  }
  if (!bucketName) bucketName = 'jindan-system.appspot.com';

  const bucket = storage.bucket(bucketName);

  try {
    await bucket.setMetadata({ cors });
    console.log('OK: Storage 버킷 CORS 설정이 적용되었습니다.');
    console.log('  버킷:', bucketName);
    process.exit(0);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('CORS 설정 실패:', msg);
    if (msg.includes('does not exist') || msg.includes('404')) {
      try {
        const [buckets] = await storage.getBuckets();
        if (buckets.length) {
          console.error('\n이 프로젝트의 버킷:', buckets.map((b) => b.name).join(', '));
          console.error('재실행 예: npx tsx scripts/set-storage-cors.ts', buckets[0].name);
        } else {
          console.error('\n→ 브라우저에서 Cloud Shell로 CORS 적용: docs/STORAGE_CORS.md');
        }
      } catch {
        console.error('\n→ 브라우저에서 Cloud Shell로 CORS 적용: docs/STORAGE_CORS.md');
      }
    }
    process.exit(1);
  }
}

main();
