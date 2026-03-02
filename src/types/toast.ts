import type { NotificationType } from './task';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  taskId?: string;
  /** Firestore notifications 문서 ID. X로 닫을 때 이 문서 삭제 */
  notificationId?: string;
  /** 출근/연차 알림 시 클릭 시 출퇴근 기록부로 이동 */
  notificationType?: NotificationType;
  createdAt: number;
}
