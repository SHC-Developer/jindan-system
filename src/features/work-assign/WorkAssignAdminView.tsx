import React, { useState } from 'react';
import { useUserList } from '../../hooks/useUserList';
import { useCompletedTasks } from '../../hooks/useCompletedTasks';
import { createTask, createNotification } from '../../lib/tasks';
import type { AppUser } from '../../types/user';
import { Loader2, Send, CheckSquare, User } from 'lucide-react';

interface WorkAssignAdminViewProps {
  currentUser: AppUser;
}

export function WorkAssignAdminView({ currentUser }: WorkAssignAdminViewProps) {
  const { users, loading: usersLoading, error: usersError } = useUserList();
  const { tasks: completedTasks, loading: completedLoading, error: completedError } = useCompletedTasks();

  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('보통');
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const toggleUser = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUids.size === users.length) setSelectedUids(new Set());
    else setSelectedUids(new Set(users.map((u) => u.uid)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUids.size === 0) {
      setSubmitMessage({ type: 'error', text: '지시할 직원을 한 명 이상 선택하세요.' });
      return;
    }
    if (!title.trim()) {
      setSubmitMessage({ type: 'error', text: '업무 내용을 입력하세요.' });
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      for (const uid of selectedUids) {
        const user = users.find((u) => u.uid === uid);
        const displayName = user?.displayName ?? null;
        const taskId = await createTask({
          assigneeId: uid,
          assigneeDisplayName: displayName,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName ?? null,
          title: title.trim(),
          description: description.trim(),
          priority: priority.trim(),
        });
        await createNotification(uid, {
          type: 'task_assigned',
          taskId,
          title: title.trim(),
        });
      }
      setSubmitMessage({
        type: 'success',
        text: `${selectedUids.size}명에게 업무 지시를 내렸습니다.`,
      });
      setTitle('');
      setDescription('');
      setSelectedUids(new Set());
    } catch (err) {
      setSubmitMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '지시 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (ms: number | null) => {
    if (!ms) return '-';
    return new Date(ms).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-brand-light/30">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-brand-dark mb-4">업무 지시</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">구분</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 현장조사, 보고서"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-sub/50 focus:border-brand-sub"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">업무 내용 (제목) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="업무 제목"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-sub/50 focus:border-brand-sub"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상세 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="상세 내용 (선택)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-sub/50 focus:border-brand-sub resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-sub/50 focus:border-brand-sub"
              >
                <option value="높음">높음</option>
                <option value="보통">보통</option>
                <option value="낮음">낮음</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">지시 대상 (직원)</label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-brand-main hover:underline"
                >
                  {selectedUids.size === users.length ? '전체 해제' : '전체 선택'}
                </button>
              </div>
              {usersLoading ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> 직원 목록 불러오는 중…
                </p>
              ) : usersError ? (
                <p className="text-sm text-red-600">{usersError}</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-gray-500">역할이 일반인 사용자가 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                  {users.map((u) => (
                    <label
                      key={u.uid}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUids.has(u.uid)}
                        onChange={() => toggleUser(u.uid)}
                        className="rounded border-gray-300 text-brand-main focus:ring-brand-sub"
                      />
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-800">
                        {u.displayName ?? u.uid.slice(0, 8)}
                        {u.jobTitle && <span className="text-gray-500 ml-1">({u.jobTitle})</span>}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {submitMessage && (
              <p
                className={`text-sm ${
                  submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {submitMessage.text}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting || usersLoading}
              className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              지시 내리기
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-brand-dark mb-4 flex items-center gap-2">
            <CheckSquare size={20} className="text-brand-sub" />
            완료 현황
          </h2>
          {completedLoading ? (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> 완료 현황 불러오는 중…
            </p>
          ) : completedError ? (
            <p className="text-sm text-red-600">{completedError}</p>
          ) : completedTasks.length === 0 ? (
            <p className="text-sm text-gray-500">완료된 업무가 없습니다.</p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">업무</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">완료 일시</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-3 px-4 text-gray-800">
                        {t.assigneeDisplayName ?? t.assigneeId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-gray-800">{t.title}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(t.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
