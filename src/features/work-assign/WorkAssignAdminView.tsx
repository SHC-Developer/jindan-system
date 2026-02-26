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
  addTaskAttachment,
  removeTaskAttachment,
  deleteTask,
} from '../../lib/tasks';
import { uploadTaskFile, formatFileSize } from '../../lib/storage';
import { downloadFileFromUrl } from '../../lib/download';
import type { AppUser } from '../../types/user';
import type { Task, TaskCategory, TaskPriority } from '../../types/task';
import { DueDateCell } from './DueDateCell';
import { PriorityBadge } from './PriorityBadge';
import { Loader2, Send, Database, LayoutDashboard, Plus, User, Users, Paperclip, Trash2, FileText, X } from 'lucide-react';

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
  referenceFiles: File[];
}

function createEmptyRow(key: string): DraftTaskRow {
  return {
    key,
    dueDate: null,
    category: '사무',
    title: '',
    description: '',
    priority: '2순위',
    referenceFiles: [],
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
  const [isJointMode, setIsJointMode] = useState(false);
  const [jointAssignees, setJointAssignees] = useState<UserListItem[]>([]);
  const [showAddJointModal, setShowAddJointModal] = useState(false);
  const [draftRows, setDraftRows] = useState<DraftTaskRow[]>(() =>
    Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${i}`))
  );
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingApprovedId, setDeletingApprovedId] = useState<string | null>(null);
  const [dashboardUploadingTaskId, setDashboardUploadingTaskId] = useState<string | null>(null);
  const [dashboardUploadProgress, setDashboardUploadProgress] = useState(0);
  const [dashboardFileTargetTaskId, setDashboardFileTargetTaskId] = useState<string | null>(null);
  const referenceInputRef = React.useRef<HTMLInputElement>(null);
  const referenceRowKeyRef = React.useRef<string | null>(null);
  const dashboardFileInputRef = React.useRef<HTMLInputElement>(null);

  const { users, loading: usersLoading, error: usersError } = useUserList();
  const { tasks: dashboardTasks, loading: dashboardLoading, error: dashboardError } = useDashboardTasks();
  const { tasks: approvedTasks, loading: approvedLoading, error: approvedError } = useApprovedTasks();

  const handleSelectEmployee = (user: UserListItem) => {
    setSelectedEmployee(user);
    setIsJointMode(false);
    setJointAssignees([]);
    setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${Date.now()}-${i}`)));
    setSubmitMessage(null);
  };

  const handleEnterJointMode = () => {
    setSelectedEmployee(null);
    setIsJointMode(true);
    setJointAssignees([]);
    setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${Date.now()}-${i}`)));
    setSubmitMessage(null);
  };

  const handleBackToEmployeeList = () => {
    setSelectedEmployee(null);
    setIsJointMode(false);
    setJointAssignees([]);
    setShowAddJointModal(false);
    setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${i}`)));
    setSubmitMessage(null);
  };

  const handleAddJointAssignee = (user: UserListItem) => {
    setJointAssignees((prev) => (prev.some((u) => u.uid === user.uid) ? prev : [...prev, user]));
  };

  const handleRemoveJointAssignee = (uid: string) => {
    setJointAssignees((prev) => prev.filter((u) => u.uid !== uid));
  };

  const handleAddRow = () => {
    setDraftRows((prev) => [...prev, createEmptyRow(`row-${Date.now()}`)]);
  };

  const handleRemoveRow = (rowKey: string) => {
    setDraftRows((prev) => prev.filter((r) => r.key !== rowKey));
  };

  const handleRowReferenceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rowKey = referenceRowKeyRef.current;
    const files = e.target.files;
    if (rowKey && files) {
      const fileList = Array.from(files);
      setDraftRows((prev) =>
        prev.map((row) => (row.key === rowKey ? { ...row, referenceFiles: fileList } : row))
      );
    }
    e.target.value = '';
    referenceRowKeyRef.current = null;
  };

  const openFileInputForRow = (rowKey: string) => {
    referenceRowKeyRef.current = rowKey;
    referenceInputRef.current?.click();
  };

  const handleDeleteApprovedTask = async (taskId: string) => {
    if (!window.confirm('이 업무를 데이터베이스에서 삭제하시겠습니까? Firebase에서도 삭제됩니다.')) return;
    setDeletingApprovedId(taskId);
    try {
      await deleteTask(taskId);
    } finally {
      setDeletingApprovedId(null);
    }
  };

  const openDashboardFileInput = (taskId: string) => {
    setDashboardFileTargetTaskId(taskId);
    setTimeout(() => dashboardFileInputRef.current?.click(), 0);
  };

  const handleDashboardFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const taskId = dashboardFileTargetTaskId;
    const file = e.target.files?.[0];
    e.target.value = '';
    setDashboardFileTargetTaskId(null);
    if (!taskId || !file) return;
    setDashboardUploadingTaskId(taskId);
    setDashboardUploadProgress(0);
    try {
      const result = await uploadTaskFile(file, taskId, (p) => setDashboardUploadProgress(p));
      await addTaskAttachment(taskId, {
        downloadUrl: result.downloadUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        fileType: result.fileType,
      });
    } finally {
      setDashboardUploadingTaskId(null);
    }
  };

  const updateDraftRow = (key: string, updates: Partial<Omit<DraftTaskRow, 'key'>>) => {
    setDraftRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...updates } : row))
    );
  };

  const assigneesForSubmit = isJointMode ? jointAssignees : selectedEmployee ? [selectedEmployee] : [];

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filled = draftRows.filter((r) => r.title.trim());
    if (filled.length === 0) {
      setSubmitMessage({ type: 'error', text: '한 건 이상 업무 내용(제목)을 입력하세요.' });
      return;
    }
    if (assigneesForSubmit.length === 0) {
      setSubmitMessage({ type: 'error', text: '지시할 담당자를 한 명 이상 선택하세요.' });
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);
    setUploadProgress(null);
    try {
      for (const assignee of assigneesForSubmit) {
        for (const row of filled) {
          const taskId = await createTask({
            assigneeId: assignee.uid,
            assigneeDisplayName: assignee.displayName ?? null,
            createdBy: currentUser.uid,
            createdByDisplayName: currentUser.displayName ?? null,
            title: row.title.trim(),
            description: row.description.trim(),
            category: row.category,
            priority: row.priority,
            dueDate: row.dueDate ?? undefined,
          });
          for (const file of row.referenceFiles) {
            setUploadProgress(0);
            const result = await uploadTaskFile(file, taskId, (p) => setUploadProgress(p));
            await addTaskAttachment(taskId, {
              downloadUrl: result.downloadUrl,
              fileName: result.fileName,
              fileSize: result.fileSize,
              fileType: result.fileType,
            });
          }
          setUploadProgress(null);
          await createNotification(assignee.uid, {
            type: 'task_assigned',
            taskId,
            title: row.title.trim(),
          });
        }
      }
      const countPeople = assigneesForSubmit.length;
      const countTasks = filled.length;
      setSubmitMessage({
        type: 'success',
        text: countPeople === 1
          ? `${assigneesForSubmit[0].displayName ?? '해당 직원'}에게 ${countTasks}건의 업무를 지시했습니다.`
          : `${countPeople}명에게 각 ${countTasks}건의 업무를 지시했습니다.`,
      });
      setDraftRows(Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => createEmptyRow(`row-${Date.now()}-${i}`)));
      if (isJointMode) setJointAssignees([]);
    } catch (err) {
      setSubmitMessage({
        type: 'error',
        text: err instanceof Error ? err.message : '지시 저장 중 오류가 발생했습니다.',
      });
    } finally {
      setUploadProgress(null);
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
        {/* 상단: 대시보드 / 업무 데이터베이스 — 하단 콘텐츠와 동일한 패딩으로 너비 통일 */}
        <div className="flex-shrink-0 px-6 pt-6">
          <div className="flex items-center justify-between py-4 px-4 bg-white border border-gray-200 rounded-t-xl">
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
              <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm min-w-[800px] table-fixed">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-28 whitespace-nowrap">마감일</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-20 whitespace-nowrap">구분</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 w-48">업무 내용</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[5rem] whitespace-nowrap">우선순위</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[5rem] whitespace-nowrap">담당자</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[11rem] whitespace-nowrap">승인 일시</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700 min-w-[10rem] whitespace-nowrap">첨부파일 (승인 시)</th>
                      <th className="py-3 px-2 text-center font-medium text-gray-700 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedTasks.map((t) => (
                      <tr key={t.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap min-w-[7rem]">
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString('ko-KR') : '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-800 whitespace-nowrap">{t.category}</td>
                        <td className="py-3 px-4 text-gray-800 min-w-0 break-words">{t.title}</td>
                        <td className="py-3 px-4 min-w-[5rem]">
                          <span className="whitespace-nowrap inline-block">
                            <PriorityBadge priority={t.priority} />
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 whitespace-nowrap">{t.assigneeDisplayName ?? t.assigneeId.slice(0, 8)}</td>
                        <td className="py-3 px-4 text-gray-600 whitespace-nowrap min-w-[11rem]">{formatDate(t.approvedAt)}</td>
                        <td className="py-3 px-4 text-gray-700 min-w-[10rem]">
                          {!t.attachments || t.attachments.length === 0 ? (
                            <span className="text-gray-500 text-xs">없음</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {t.attachments.map((att, i) => (
                                <li key={i}>
                                  <button
                                    type="button"
                                    onClick={() => downloadFileFromUrl(att.downloadUrl, att.fileName)}
                                    className="flex items-center gap-1 text-xs text-brand-main hover:underline truncate max-w-[200px]"
                                  >
                                    <FileText size={12} />
                                    {att.fileName}
                                    <span className="text-gray-400">({formatFileSize(att.fileSize)})</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteApprovedTask(t.id)}
                            disabled={deletingApprovedId === t.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 inline-flex"
                            aria-label="업무 삭제"
                          >
                            {deletingApprovedId === t.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </td>
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
            {!selectedEmployee && !isJointMode ? (
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
                    <button
                      type="button"
                      onClick={handleEnterJointMode}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-brand-sub bg-brand-sub/5 hover:bg-brand-sub/10 text-brand-main transition-colors"
                    >
                      <span className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-brand-main">
                        <Users size={24} />
                      </span>
                      <span className="text-sm font-medium text-center">
                        공동 임무 지시
                      </span>
                    </button>
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
              /* 선택한 직원 또는 공동 임무 지시: 4행 테이블 */
              <section className="mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={handleBackToEmployeeList}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition-colors"
                      aria-label="직원 목록으로 돌아가기"
                    >
                      <span aria-hidden>←</span>
                      <span>목록</span>
                    </button>
                    <span className="font-semibold text-brand-dark text-base">
                      {isJointMode ? (
                        <>
                          공동 임무 지시
                          <span className="text-brand-main font-medium ml-1">
                            ({jointAssignees.length}명)
                          </span>
                        </>
                      ) : (
                        <>
                          새 업무 지시
                          <span className="text-brand-main font-medium ml-1">
                            ({selectedEmployee!.displayName ?? selectedEmployee!.uid.slice(0, 8)})
                          </span>
                        </>
                      )}
                    </span>
                    {isJointMode && (
                      <button
                        type="button"
                        onClick={() => setShowAddJointModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-sub bg-brand-sub/10 text-brand-main text-sm font-medium hover:bg-brand-sub/20 transition-colors"
                        aria-label="담당자 추가"
                      >
                        <Plus size={18} />
                        <span>담당자 추가</span>
                      </button>
                    )}
                  </div>
                  {isJointMode && jointAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 w-full">
                      {jointAssignees.map((u) => (
                        <span
                          key={u.uid}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs"
                        >
                          {u.displayName ?? u.uid.slice(0, 8)}
                          <button
                            type="button"
                            onClick={() => handleRemoveJointAssignee(u.uid)}
                            className="p-0.5 text-gray-500 hover:text-red-600 rounded"
                            aria-label="제거"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {showAddJointModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-label="담당자 선택"
                  >
                    <div className="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[80vh] flex flex-col p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-brand-dark">담당자 추가</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddJointModal(false)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          aria-label="닫기"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="overflow-y-auto flex-1 space-y-1">
                        {users
                          .filter((u) => !jointAssignees.some((a) => a.uid === u.uid))
                          .map((u) => (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() => handleAddJointAssignee(u)}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                            >
                              <span className="w-8 h-8 rounded-full bg-brand-light flex items-center justify-center text-brand-main flex-shrink-0">
                                <User size={16} />
                              </span>
                              <span className="text-sm font-medium text-gray-800">
                                {u.displayName ?? u.uid.slice(0, 8)}
                              </span>
                            </button>
                          ))}
                        {users.filter((u) => !jointAssignees.some((a) => a.uid === u.uid)).length === 0 && (
                          <p className="text-sm text-gray-500 py-4 text-center">추가할 수 있는 직원이 없습니다.</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddJointModal(false)}
                        className="mt-3 w-full py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                )}
                <form onSubmit={handleBatchSubmit} className="p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="py-3 pl-4 pr-1 text-left font-medium text-gray-700 w-8">#</th>
                          <th className="py-3 px-2 text-left font-medium text-gray-700 w-28">마감일</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">구분</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700">업무 내용</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">우선순위</th>
                          <th className="py-3 px-4 text-left font-medium text-gray-700 min-w-[140px]">(참고 파일첨부)</th>
                          <th className="py-3 px-2 text-center font-medium text-gray-700 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftRows.map((row, idx) => (
                          <tr key={row.key} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 pl-4 pr-1 text-gray-600 w-8">{idx + 1}</td>
                            <td className="py-2 px-2">
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
                                className="w-full min-w-[72px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4 align-top">
                              <input
                                type="text"
                                value={row.title}
                                onChange={(e) => updateDraftRow(row.key, { title: e.target.value })}
                                placeholder="주제 입력"
                                className="w-full min-w-[220px] px-3 py-2 border border-gray-200 rounded text-base"
                              />
                              <textarea
                                value={row.description}
                                onChange={(e) => updateDraftRow(row.key, { description: e.target.value })}
                                placeholder="업무 상세 내용 작성"
                                rows={4}
                                className="w-full min-w-[220px] mt-2 px-3 py-2 border border-gray-200 rounded text-sm text-gray-700 resize-none"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <select
                                value={row.priority}
                                onChange={(e) => updateDraftRow(row.key, { priority: e.target.value as TaskPriority })}
                                className="w-full min-w-[80px] px-2 py-1.5 border border-gray-200 rounded text-sm"
                              >
                                {PRIORITIES.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-4 align-top">
                              <div className="space-y-1">
                                <input
                                  ref={referenceInputRef}
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={handleRowReferenceFilesChange}
                                />
                                <button
                                  type="button"
                                  onClick={() => openFileInputForRow(row.key)}
                                  className="flex items-center gap-1 text-sm text-brand-main hover:underline"
                                >
                                  <Paperclip size={14} /> 파일 첨부
                                </button>
                                <p className="text-xs text-gray-500">여러 파일 선택 가능</p>
                                {row.referenceFiles.length > 0 && (
                                  <p className="text-xs text-gray-600 font-medium">
                                    {row.referenceFiles.length}개 선택됨
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center align-top">
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(row.key)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded inline-flex"
                                aria-label="이 행 삭제"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="mt-4 flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-brand-sub rounded-xl text-brand-main font-medium hover:bg-brand-sub/5"
                  >
                    <Plus size={20} /> 업무 추가
                  </button>
                  {submitMessage && (
                    <p className={`mt-3 text-sm ${submitMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {submitMessage.text}
                    </p>
                  )}
                  {uploadProgress !== null && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-brand-main">
                      <Loader2 size={18} className="animate-spin flex-shrink-0" />
                      <span>파일 업로드 중… {uploadProgress}%</span>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="submit"
                      disabled={submitting || (isJointMode && jointAssignees.length === 0)}
                      className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
                      title={isJointMode && jointAssignees.length === 0 ? '담당자 추가 버튼으로 지시할 사람을 선택하세요' : undefined}
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

            {/* 전체 업무 현황 — 직원 선택 또는 공동 지시 폼이 열려 있을 때는 숨김 */}
            {!selectedEmployee && !isJointMode && (
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
                  <>
                    <input
                      ref={dashboardFileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleDashboardFileSelect}
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="py-3 px-4 text-left font-medium text-gray-700 w-28"># 마감일</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">담당자</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">구분</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-700">업무 내용</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-700 w-24">우선순위</th>
                            <th className="py-3 px-4 text-left font-medium text-gray-700 min-w-[240px]">완료 / 승인</th>
                            <th className="py-3 px-2 text-center font-medium text-gray-700 w-10"></th>
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
                              onDelete={deleteTask}
                              onOpenFileInput={openDashboardFileInput}
                              onRemoveAttachment={removeTaskAttachment}
                              isUploading={dashboardUploadingTaskId === task.id}
                              uploadProgress={dashboardUploadProgress}
                              onDownloadFile={downloadFileFromUrl}
                              formatFileSize={formatFileSize}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
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
  onRequestRevision: (taskId: string, u: { title?: string; description?: string; category?: TaskCategory; priority?: TaskPriority }) => Promise<void>;
  onOpenDetail: () => void;
  onDelete: (taskId: string) => Promise<void>;
  onOpenFileInput: (taskId: string) => void;
  onRemoveAttachment: (taskId: string, index: number) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
  onDownloadFile: (url: string, fileName: string) => Promise<void>;
  formatFileSize: (bytes: number) => string;
  key?: React.Key;
}

function DashboardRow({
  task,
  onUpdateTask,
  onApprove,
  onRequestRevision,
  onOpenDetail,
  onDelete,
  onOpenFileInput,
  onRemoveAttachment,
  isUploading,
  uploadProgress,
  onDownloadFile,
  formatFileSize,
}: DashboardRowProps) {
  const [saving, setSaving] = useState(false);
  const [revising, setRevising] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDescription, setLocalDescription] = useState(task.description);
  const isSubmitted = task.status === 'submitted';
  const attachments = Array.isArray(task.attachments) ? task.attachments : [];

  useEffect(() => {
    setLocalTitle(task.title);
  }, [task.id, task.title]);

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

  const handleTitleBlur = () => {
    const trimmed = localTitle.trim();
    if (trimmed === task.title) return;
    setSaving(true);
    onUpdateTask(task.id, { title: trimmed || task.title }).finally(() => setSaving(false));
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
        title: localTitle.trim(),
        description: localDescription,
        category: task.category,
        priority: task.priority,
      });
    } finally {
      setRevising(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('이 업무를 삭제하시겠습니까? 담당자 목록에서도 사라집니다.')) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
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
          className="w-full min-w-[72px] px-2 py-1.5 border border-gray-200 rounded text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4 align-top">
        <div className="space-y-2 min-w-[200px]">
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-base font-medium placeholder:text-gray-400"
            placeholder="업무 주제"
          />
          <textarea
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            className="w-full px-2 py-1.5 border border-gray-200 rounded text-base resize-y min-h-[4rem]"
            rows={3}
            placeholder="상세 내용 (재검토 지시 시 수정 후 재검토 지시 버튼 클릭)"
          />
        </div>
      </td>
      <td className="py-3 px-4">
        <select
          value={task.priority}
          onChange={handlePriorityChange}
          className="w-full min-w-[80px] px-2 py-1.5 border border-gray-200 rounded text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td className="py-3 px-4 align-top overflow-visible min-w-[240px]">
        <div className="flex flex-col gap-2">
          {/* 첨부 파일 블록: 항상 맨 위에 배치해 셀 잘림 방지 */}
          <div className="border border-brand-sub/40 rounded-lg bg-brand-light/50 px-2.5 py-2 space-y-1.5 flex-shrink-0">
            <p className="text-xs font-semibold text-brand-dark flex items-center gap-1">
              <Paperclip size={14} /> 첨부 파일 {attachments.length > 0 && <span className="text-brand-main">({attachments.length}개)</span>}
            </p>
            {attachments.length === 0 ? (
              <p className="text-xs text-gray-500">없음</p>
            ) : (
              <ul className="space-y-0.5">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDownloadFile(att.downloadUrl, att.fileName)}
                      className="flex items-center gap-1 text-xs text-brand-main hover:underline truncate max-w-[160px]"
                    >
                      <FileText size={12} />
                      {att.fileName}
                    </button>
                    <span className="text-gray-400 text-xs flex-shrink-0">({formatFileSize(att.fileSize)})</span>
                    <button
                      type="button"
                      onClick={() => onRemoveAttachment(task.id, i)}
                      className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                      aria-label="첨부 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onOpenFileInput(task.id)}
              disabled={isUploading}
              className="flex items-center gap-1 text-xs text-brand-main hover:underline disabled:opacity-50 font-medium"
            >
              <Paperclip size={12} /> 파일 첨부
            </button>
            {isUploading && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Loader2 size={12} className="animate-spin" />
                {uploadProgress}%
              </div>
            )}
          </div>
          {!isSubmitted ? (
            <span className="text-gray-400 text-xs">대기 중</span>
          ) : (
            <>
              <div className="flex w-full gap-1.5">
                <button
                  type="button"
                  onClick={onOpenDetail}
                  className="flex-1 min-w-0 text-xs font-medium px-3 py-1.5 rounded bg-brand-sub text-white hover:bg-brand-sub/90"
                >
                  내용확인
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex-1 min-w-0 text-xs font-medium px-3 py-1.5 rounded bg-brand-main text-white hover:bg-brand-main/90 disabled:opacity-50"
                >
                  최종 승인
                </button>
              </div>
              <button
                type="button"
                onClick={handleRevision}
                disabled={revising}
                className="w-full text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                재검토 지시
              </button>
            </>
          )}
        </div>
      </td>
      <td className="py-3 px-2 text-center">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 inline-flex"
          aria-label="업무 삭제"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
