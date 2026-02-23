import type { Timestamp } from 'firebase/firestore';

/** Firestore messages 서브컬렉션 문서 필드 (저장 시) */
export interface ChatMessagePayload {
  senderId: string;
  senderDisplayName: string;
  senderJobTitle: string | null;
  text: string;
  /** serverTimestamp() 사용 시 로컬 스냅샷에서 null일 수 있음 */
  createdAt: Timestamp | null;

  /** 첨부 파일 정보 (없으면 null) */
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
}

/** 목록/표시용 메시지 (문서 ID 포함) */
export interface ChatMessage extends ChatMessagePayload {
  id: string;
}
