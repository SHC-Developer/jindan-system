import { formatFileSize } from './storage';
import type { PendingChatFile } from '../types/chat';

/** 채팅 첨부 파일 최대 크기 (100MB) */
export const MAX_CHAT_FILE_SIZE = 100 * 1024 * 1024;

export function validateChatFile(
  file: File
): { ok: true } | { ok: false; message: string } {
  if (file.size > MAX_CHAT_FILE_SIZE) {
    return {
      ok: false,
      message: `파일 크기는 100MB 이하여야 합니다. (현재: ${formatFileSize(file.size)})`,
    };
  }
  return { ok: true };
}

export function createPendingFile(file: File): PendingChatFile {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const previewUrl = file.type.startsWith('image/')
    ? URL.createObjectURL(file)
    : undefined;
  return { id, file, previewUrl };
}
