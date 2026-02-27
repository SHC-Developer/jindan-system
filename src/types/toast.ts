export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  taskId?: string;
  /** Firestore notifications 문서 ID. X로 닫을 때 이 문서 삭제 */
  notificationId?: string;
  createdAt: number;
}
