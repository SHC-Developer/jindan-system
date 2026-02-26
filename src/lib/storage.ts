import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
