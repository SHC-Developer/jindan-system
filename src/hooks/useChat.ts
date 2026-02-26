import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, addDoc, deleteDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { getMessagesRef, getMessageRef } from '../lib/firestore-paths';
import { uploadChatFile, deleteTaskFileByUrl, type UploadProgressCallback } from '../lib/storage';
import type { ChatMessage } from '../types/chat';
import type { AppUser } from '../types/user';

interface UseChatOptions {
  projectId: string;
  subMenuId: string;
  currentUser: AppUser | null;
}

interface UseChatResult {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  sendFileMessage: (file: File, text?: string, onProgress?: UploadProgressCallback) => Promise<void>;
  deleteMessage: (messageId: string, msg: ChatMessage) => Promise<void>;
  canDeleteMessage: (msg: ChatMessage, user: AppUser | null) => boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

/** 관리자는 모든 메시지, 일반 사용자는 본인 발신 메시지만 삭제 가능 */
export function canDeleteMessage(msg: ChatMessage, user: AppUser | null): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return msg.senderId === user.uid;
}

export function useChat({
  projectId,
  subMenuId,
  currentUser,
}: UseChatOptions): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!projectId || !subMenuId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const messagesRef = getMessagesRef(projectId, subMenuId);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    let unsub: (() => void) | null = null;
    unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: ChatMessage[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            senderId: data.senderId ?? '',
            senderDisplayName: data.senderDisplayName ?? '',
            senderJobTitle: data.senderJobTitle ?? null,
            text: data.text ?? '',
            createdAt: data.createdAt ?? null,
            fileUrl: data.fileUrl ?? null,
            fileName: data.fileName ?? null,
            fileSize: data.fileSize ?? null,
            fileType: data.fileType ?? null,
          };
        });
        setMessages(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : '메시지를 불러오지 못했습니다.');
        setLoading(false);
        if (unsub) {
          unsub();
          unsub = null;
        }
      }
    );

    return () => {
      if (unsub) unsub();
    };
  }, [projectId, subMenuId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !currentUser) return;

      const messagesRef = getMessagesRef(projectId, subMenuId);
      try {
        await addDoc(messagesRef, {
          senderId: currentUser.uid,
          senderDisplayName: currentUser.displayName ?? '이름 없음',
          senderJobTitle: currentUser.jobTitle ?? null,
          text: trimmed,
          createdAt: serverTimestamp(),
          fileUrl: null,
          fileName: null,
          fileSize: null,
          fileType: null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.');
      }
    },
    [projectId, subMenuId, currentUser]
  );

  const sendFileMessage = useCallback(
    async (file: File, text?: string, onProgress?: UploadProgressCallback) => {
      if (!currentUser) return;

      try {
        const result = await uploadChatFile(file, projectId, subMenuId, onProgress);

        const messagesRef = getMessagesRef(projectId, subMenuId);
        await addDoc(messagesRef, {
          senderId: currentUser.uid,
          senderDisplayName: currentUser.displayName ?? '이름 없음',
          senderJobTitle: currentUser.jobTitle ?? null,
          text: text?.trim() || '',
          createdAt: serverTimestamp(),
          fileUrl: result.downloadUrl,
          fileName: result.fileName,
          fileSize: result.fileSize,
          fileType: result.fileType,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '파일 업로드에 실패했습니다.';
        setError(msg);
        throw err;
      }
    },
    [projectId, subMenuId, currentUser]
  );

  const deleteMessage = useCallback(
    async (messageId: string, msg: ChatMessage) => {
      if (!currentUser) return;
      if (!canDeleteMessage(msg, currentUser)) {
        setError('이 메시지를 삭제할 권한이 없습니다.');
        return;
      }
      try {
        if (msg.fileUrl) {
          try {
            await deleteTaskFileByUrl(msg.fileUrl);
          } catch {
            // Storage 삭제 실패해도 Firestore 메시지는 삭제 진행
          }
        }
        const messageRef = getMessageRef(projectId, subMenuId, messageId);
        await deleteDoc(messageRef);
      } catch (err) {
        setError(err instanceof Error ? err.message : '메시지 삭제에 실패했습니다.');
        throw err;
      }
    },
    [projectId, subMenuId, currentUser]
  );

  return { messages, sendMessage, sendFileMessage, deleteMessage, canDeleteMessage, loading, error, clearError };
}
