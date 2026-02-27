import React, { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteAllUsersNotifications } from '../../lib/notifications';

const CONFIRM_MESSAGE = 'notifications 문서 필드를 삭제하시겠습니까?';

export function AdminPage() {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDeleteNotifications = async () => {
    if (!window.confirm(CONFIRM_MESSAGE)) return;
    setDeleting(true);
    setMessage(null);
    try {
      await deleteAllUsersNotifications();
      setMessage({ type: 'success', text: '모든 사용자의 notifications 문서가 삭제되었습니다.' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-brand-dark mb-6">관리자 페이지</h1>
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-medium text-gray-700 mb-2">데이터 관리</h2>
        <p className="text-sm text-gray-600 mb-4">
          모든 사용자의 notifications(알림) 문서를 일괄 삭제합니다. 실행 후 확인 메시지에서 예를 선택해야 삭제됩니다.
        </p>
        <button
          type="button"
          onClick={handleDeleteNotifications}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
          notifications 데이터 지우기
        </button>
        {message && (
          <p
            className={`mt-4 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
          >
            {message.text}
          </p>
        )}
      </section>
    </div>
  );
}
