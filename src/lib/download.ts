import { ref, getBlob } from 'firebase/storage';
import { getStorageInstance } from './firebase';

function getStoragePathFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl);
    if (!url.hostname.includes('firebasestorage.googleapis.com')) return null;
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * URL에서 파일을 blob으로 받아 로컬에 다운로드되도록 트리거합니다.
 * Firebase Storage URL은 getBlob(SDK)로 CORS 없이 다운로드하고,
 * 그 외 URL은 fetch → blob → object URL로 처리합니다.
 * 둘 다 실패 시 새 탭에서 열어 사용자가 저장할 수 있게 합니다.
 */
export async function downloadFileFromUrl(url: string, fileName: string): Promise<void> {
  const name = fileName || 'download';

  try {
    const storagePath = getStoragePathFromDownloadUrl(url);
    if (storagePath) {
      const storage = getStorageInstance();
      const storageRef = ref(storage, storagePath);
      const blob = await getBlob(storageRef);
      triggerBlobDownload(blob, name);
      return;
    }
  } catch {
    /* Firebase getBlob 실패 시 fetch 시도 */
  }

  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
    const blob = await res.blob();
    triggerBlobDownload(blob, name);
    return;
  } catch {
    /* fetch 실패 시 새 탭에서 열기 (CORS 등으로 인한 대안) */
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
