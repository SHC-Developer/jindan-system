import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserList } from '../../hooks/useUserList';
import { useDashboardTasks } from '../../hooks/useDashboardTasks';
import { useApprovedTasks } from '../../hooks/useApprovedTasks';
import {
  createTask,
  createNotification,
  updateTask,
  approveTask,
  requestRevision,
} from '../../lib/tasks';
import type { AppUser } from '../../types/user';
import type { Task, TaskCategory, TaskPriority } from '../../types/task';
import { DueDateCell } from './DueDateCell';
import { PriorityBadge } from './PriorityBadge';
import { Loader2, Send, CheckCircle, Database, LayoutDashboard, Plus, User } from 'lucide-react';

type TabId = 'dashboard' | 'database';

const CATEGORIES: TaskCategory[] = ['현장', '사무'];
const PRIORITIES: TaskPriority[] = ['1순위', '2순위', '3순위'];

const DEFAULT_ROW_COUNT = 4;

interface DraftTaskRow {
  key: string;
  dueDate: number | null;
  category: TaskCategory;
  title: string;
  description: string;
  priority: TaskPriority;
}

function createEmptyRow(key: string): DraftTaskRow {
  return {
    key,
    dueDate: null,
    category: '사무',
    title: '',
    description: '',
    priority: '2순위',
  };
}

interface UserListItem {
  uid: string;
  displayName: string | null;
  jobTitle: string | null;
  email: string | null;
}

interface WorkAssignAdminViewProps {
  currentUser: AppUser;
}

export function WorkAssignAdminView({ currentUser }: WorkAssignAdminViewProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedEmployee, setSelectedEmployee] = useState<UserListItem | null>(null);
  const [draftRows, setDraftRows] = useState<DraftTaskRow[]>(() =>
    Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${i}`))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { users, loading: usersLoading, error: usersError } = useUserList();
  const { tasks: dashboardTasks, loading: dashboardLoading, error: dashboardError } = useDashboardTasks();
  const { tasks: approvedTasks, loading: approvedLoading, error: approvedError } = useApprovedTasks();

  const handleSelectEmployee = (user: UserListItem) => {
    setSelectedEmployee(user);
    setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${Date.now()}-${i}`)));
    setSubmitMessage(null);
  };

  const handleBackToEmployeeList = () => {
    setSelectedEmployee(null);
    setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${i}`)));
    setSubmitMessage(null);
  };

  const updateDraftRow = (key: string, updates: Partial<Omit<DraftTaskRow, 'key'>>) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...updates } : row))
    );
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const filled = draftRows.filter((r) => r.title.trim());
    if (filled.length === 0) {
      setSubmitMessage({ type: 'error', text: '한 건 이상 업무 내용(제목)을 입력하세요.' });
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    try {
      for (const row of filled) {
        const taskId = await createTask({
          assigneeId: selectedEmployee.uid,
          assigneeDisplayName: selectedEmployee.displayName ?? null,
          createdBy: currentUser.uid,
          createdByDisplayName: currentUser.displayName ?? null,
          title: row.title.trim(),
          description: row.description.trim(),
          category: row.category,
          priority: row.priority,
          dueDate: row.dueDate ?? undefined,
        });
        await createNotification(selectedEmployee.uid, {
          type: 'task_assigned',
          taskId,
          title: row.title.trim(),
        });
      }
      setSubmitMessage({
        type: 'success',
        text: `${selectedEmployee.displayName ?? '해당 직원'}에게 ${filled.length}건의 업무를 지시했습니다.`,
      });
      setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${Date.now()}-${i}`)));
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
    <div className="w-full h-full flex flex-col overflow-hidden bg-brand-light/30">
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col min-h-0 overflow-hidden">
        {/* 상단: 대시보드 / 업무 데이터베이스 */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'dashboard'
                ? 'bg-brand-main text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <LayoutDashboard size={16} />
            대시보드
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('database')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === 'database'
                ? 'bg-brand-main text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Database size={16} />
            업무 데이터베이스
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'database' ? (
          /* 업무 데이터베이스: 승인된 업무만 */
          <section>
            <h2 className="text-lg font-semibold text-brand-dark mb-4">승인된 업무</h2>
            {approvedLoading ? (
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> 불러오는 중…
              </p>
            ) : approvedError ? (
              <p className="text-sm text-red-600">{approvedError}</p>
            ) : approvedTasks.length === 0 ? (
              <p className="text-sm text-gray-500">승인된 업무가 없습니다.</p>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-24">마감일</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-20">구분</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">업무 내용</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-20">우선순위</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-24">담당자</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-28">승인 일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedTasks.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4 text-gray-600">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-800">{t.category}</td>
                        <td className="py-3 px-4 text-gray-800">{t.title}</td>
                        <td className="py-3 px-4">
                          <PriorityBadge priority={t.priority} />
                        </td>
                        <td className="py-3 px-4 text-gray-800">
                          {t.assigneeDisplayName ?? t.assigneeId.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(t.approvedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          /* 대시보드: 직원 그리드 또는 배치 지시 폼 + 전체 업무 테이블 */
          <>
            {!selectedEmployee ? (
              /* 직원 선택 그리드 */
              <section className="mb-6">
                <h2 className="text-lg font-semibold text-brand-dark mb-3">지시할 직원을 선택하세요</h2>
                {usersLoading ? (
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> 직원 목록 불러오는 중…
                  </p>
                ) : usersError ? (
                  <p className="text-sm text-red-600">{usersError}</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-gray-500">역할이 일반인 사용자가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {users.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => handleSelectEmployee(u)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-brand-sub hover:bg-brand-sub/5 text-brand-dark transition-colors"
                      >
                        <span className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-brand-main">
                          <User size={24} />
                        </span>
                        <span className="text-sm font-medium truncate w-full text-center">
                          {u.displayName ?? u.uid.slice(0, 8)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ) : (
              /* 선택한 직원에게 배치 지시: 4행 테이블 */
              <section className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBackToEmployeeList}
                      className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
                      aria-label="목록으로"
                    >
                      ←
                    </button>
                    <span className="font-medium text-brand-dark">
                      새 업무 지시 — {selectedEmployee.displayName ?? selectedEmployee.uid.slice(0, 8)}
                    </span>
                  </div>
                </div>
                <form onSubmit={handleBatchSubmit} className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-20">#</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-28">마감일</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">CATEGORY (구분)</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">TASK DESCRIPTION (업무 내용)</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">PRIORITY (우선순위)</th>
                          <th className="py-3 px-4 text-center font-medium text-gray-700 w-20">DONE (완료)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRows.map((row, idx) => (
                          <tr key={row.key} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 px-4 text-gray-600">{idx + 1}</td>
                            <td className="py-2 px-4">
                              <input
                                type="date"
                                value={row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : ''}
                                onChange={(e) =>
                                  updateDraftRow(row.key, {
                                    dueDate: e.target.value ? new Date(e.target.value).getTime() : null,
                                  })
                                }
                                className="w-full max-w-[140px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <select
                                value={row.category}
                                onChange={(e) => updateDraftRow(row.key, { category: e.target.value as TaskCategory })}
                                className="w-full max-w-[100px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={row.title}
                                onChange={(e) => updateDraftRow(row.key, { title: e.target.value })}
                                placeholder="업무 내용 입력"
                                className="w-full min-w-[180px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              />
                              <input
                                type="text"
                                value={row.description}
                                onChange={(e) => updateDraftRow(row.key, { description: e.target.value })}
                                placeholder="상세 (선택)"
                                className="w-full min-w-[180px] mt-1 px-2 py-1 border border-gray-100 rounded text-xs text-gray-500"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <select
                                value={row.priority}
                                onChange={(e) => updateDraftRow(row.key, { priority: e.target.value as TaskPriority })}
                                className="w-full max-w-[90px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              >
                                {PRIORITIES.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4 text-center text-gray-400">—</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {submitMessage && (
                    <p className={`mt-3 text-sm ${submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {submitMessage.text}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                    >
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      지시 내리기
                    </button>
                    <button
                      type="button"
                      onClick={handleBackToEmployeeList}
                      className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      목록으로
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* 전체 업무 현황 테이블 */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <h2 className="text-lg font-semibold text-brand-dark px-4 py-3 border-b border-gray-200 bg-gray-50">
                전체 업무 현황
              </h2>
              {dashboardLoading ? (
                <div className="p-8 text-center text-sm text-gray-500">
                  <Loader2 size={18} className="animate-spin mx-auto mb-2" /> 불러오는 중…
                </div>
              ) : dashboardError ? (
                <div className="p-8 text-center text-sm text-red-600">{dashboardError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="py-3 px-4 text-left font-medium text-gray-700 w-28"># 마감일</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">담당자</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">구분</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-700">업무 내용</th>
                        <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">우선순위</th>
                        <th className="py-3 px-4 text-center font-medium text-gray-700 w-40">완료 / 승인</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardTasks.map((task) => (
                        <DashboardRow
                          key={task.id}
                          task={task}
                          onUpdateTask={updateTask}
                          onApprove={approveTask}
                          onRequestRevision={requestRevision}
                          onOpenDetail={() => navigate(`/task/${task.id}`)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}

interface DashboardRowProps {
  task: Task;
  onUpdateTask: typeof updateTask;
  onApprove: (taskId: string) => Promise<void>;
  onRequestRevision: (taskId: string, u: { description?: string; category?: TaskCategory; priority?: TaskPriority }) => Promise<void>;
  onOpenDetail: () => void;
  key?: React.Key;
}

function DashboardRow({ task, onUpdateTask, onApprove, onRequestRevision, onOpenDetail }: DashboardRowProps) {
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [localDescription, setLocalDescription] = useState(task.description);
  const isSubmitted = task.status === 'submitted';

  useEffect(() => {
    setLocalDescription(task.description);
  }, [task.id, task.description]);

  const handleDueDateSave = (dueDate: number | null) => {
    setSaving(true);
    onUpdateTask(task.id, { dueDate }).finally(() => setSaving(false));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as TaskCategory;
    setSaving(true);
    onUpdateTask(task.id, { category: v }).finally(() => setSaving(false));
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as TaskPriority;
    setSaving(true);
    onUpdateTask(task.id, { priority: v }).finally(() => setSaving(false));
  };

  const handleDescriptionBlur = () => {
    if (localDescription.trim() === task.description) return;
    setSaving(true);
    onUpdateTask(task.id, { description: localDescription.trim() }).finally(() => setSaving(false));
  };

  const handleApprove = async () => {
    setSaving(true);
    try {
      await onApprove(task.id);
    } finally {
      setSaving(false);
    }
  };

  const handleRevision = async () => {
    setRevising(true);
    try {
      await onRequestRevision(task.id, {
        description: task.description,
        category: task.category,
        priority: task.priority,
      });
    } finally {
      setRevising(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="py-3 px-4">
        <DueDateCell dueDate={task.dueDate} onSave={handleDueDateSave} editable={true} />
      </td>
      <td className="py-3 px-4">
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-brand-main hover:underline text-left"
        >
          {task.assigneeDisplayName ?? task.assigneeId.slice(0, 8)}
        </button>
      </td>
      <td className="py-3 px-4">
        <select
          value={task.category}
          onChange={handleCategoryChange}
          className="w-full max-w-[100px] px-2 py-1.5 border border-gray-200 rounded text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4">
        <textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          className="w-full min-w-[200px] px-2 py-1.5 border border-gray-200 rounded text-sm resize-none"
          rows={2}
          placeholder="업무 내용"
        />
        <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[240px]">{task.title}</p>
      </td>
      <td className="py-3 px-4">
        <select
          value={task.priority}
          onChange={handlePriorityChange}
          className="w-full max-w-[90px] px-2 py-1.5 border border-gray-200 rounded text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4 text-center">
        {!isSubmitted ? (
          <span className="text-gray-400 text-xs">대기 중</span>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="text-xs font-medium px-2 py-1 rounded bg-brand-main text-white hover:bg-brand-main/90 disabled:opacity-50"
            >
              최종 승인
            </button>
            <button
              type="button"
              onClick={handleRevision}
              disabled={revising}
              className="text-xs font-medium px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              재검토
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
