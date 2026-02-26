import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import type { UploadTaskSnapshot } from 'firebase/storage';
import { getStorageInstance } from './firebase';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const UPLOAD_TIMEOUT_MS = 90_000; // 90초 후 타임아웃

export interface UploadResult {
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

export type UploadProgressCallback = (percent: number) => void;

/**
 * 채팅 첨부 파일을 Firebase Storage에 업로드한다.
 * 경로: chat-files/{projectId}/{subMenuId}/{timestamp}_{fileName}
 */
export async function uploadChatFile(
  file: File,
  projectId: string,
  subMenuId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (file.size >= MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 100MB를 초과합니다. (${formatFileSize(file.size)})`);
  }

  const storage = getStorageInstance();
  const safeName = `${Date.now()}_${file.name}`;
  const storagePath = `chat-files/${projectId}/${subMenuId}/${safeName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (err) => reject(err),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('업로드 시간이 초과되었습니다. Storage 설정과 네트워크를 확인해 주세요.'));
    }, UPLOAD_TIMEOUT_MS);
  });

  return Promise.race([
    uploadPromise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageFile(fileType: string): boolean {
  return fileType.startsWith('image/');
}

/**
 * 업무 첨부 파일을 Firebase Storage에 업로드한다.
 * 경로: task-files/{taskId}/{timestamp}_{fileName}
 */
export async function uploadTaskFile(
  file: File,
  taskId: string,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  if (file.size >= MAX_FILE_SIZE) {
    throw new Error(`파일 크기가 100MB를 초과합니다. (${formatFileSize(file.size)})`);
  }

  const storage = getStorageInstance();
  const safeName = `${Date.now()}_${file.name}`;
  const storagePath = `task-files/${taskId}/${safeName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type || 'application/octet-stream',
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  const uploadPromise = new Promise<UploadResult>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot: UploadTaskSnapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(percent);
      },
      (err) => reject(err),
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || 'application/octet-stream',
          });
        } catch (err) {
          reject(err);
        }
      }
    );
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      uploadTask.cancel();
      reject(new Error('업로드 시간이 초과되었습니다. Storage 설정과 네트워크를 확인해 주세요.'));
    }, UPLOAD_TIMEOUT_MS);
  });

  return Promise.race([
    uploadPromise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}

/**
 * Firebase Storage 다운로드 URL에서 저장 경로를 추출한다.
 * URL 형식: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token=...
 */
function getStoragePathFromDownloadUrl(downloadUrl: string): string | null {
  try {
    const url = new URL(downloadUrl);
    const match = url.pathname.match(/\/o\/(.+)$/);
    if (!match) return null;
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

/**
 * 업무 첨부 파일을 Firebase Storage에서 삭제한다.
 * downloadUrl은 업로드 시 받은 Storage 다운로드 URL이어야 한다.
 */
export async function deleteTaskFileByUrl(downloadUrl: string): Promise<void> {
  const path = getStoragePathFromDownloadUrl(downloadUrl);
  if (!path) return;
  const storage = getStorageInstance();
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * 최종 승인 시: task-files/{taskId}/ 아래 파일 중 approvedDownloadUrls에 없는 것은 Storage에서 삭제.
 * 승인 시점의 첨부만 남기고 재검토 과정에서 생긴 나머지 파일을 정리할 때 사용.
 */
export async function deleteTaskStorageFilesExcept(
  taskId: string,
  approvedDownloadUrls: string[]
): Promise<void> {
  const approvedPaths = new Set<string>();
  for (const url of approvedDownloadUrls) {
    const p = getStoragePathFromDownloadUrl(url);
    if (p) approvedPaths.add(p);
  }
  const storage = getStorageInstance();
  const listRef = ref(storage, `task-files/${taskId}`);
  const result = await listAll(listRef);
  await Promise.all(
    result.items
      .filter((itemRef) => !approvedPaths.has(itemRef.fullPath))
      .map((itemRef) => deleteObject(itemRef))
  );
}
