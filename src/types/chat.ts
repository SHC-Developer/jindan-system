import type { Timestamp } from 'firebase/firestore';

/** Firestore messages 서브컬렉션 문서 필드 (저장 시) */
export interface ChatMessagePayload {
  senderId: string;
  senderDisplayName: string;
  senderJobTitle: string | null;
  /** 발신자 프로필 사진 URL (선택, 채팅 목록 표시용) */
  senderPhotoURL: string | null;
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

/** 채팅 전송 전 첨부 대기 파일 (미리보기 URL은 이미지일 때만) */
export interface PendingChatFile {
  id: string;
  file: File;
  previewUrl?: string;
}
