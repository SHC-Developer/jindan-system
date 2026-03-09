import React, { useState, useEffect } from 'react';
import { DueDateCell } from '../DueDateCell';
import { Loader2, Paperclip, Trash2, FileText } from 'lucide-react';
import type { Task, TaskCategory, TaskPriority } from '../../../types/task';

const CATEGORIES: TaskCategory[] = ['현장', '사무'];
const PRIORITIES: TaskPriority[] = ['1순위', '2순위', '3순위'];

export interface DashboardCardProps {
  task: Task;
  onUpdateTask: (taskId: string, updates: Partial<Pick<Task, 'dueDate' | 'category' | 'priority' | 'title' | 'description'>>) => Promise<void>;
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
}

export function DashboardCard({
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
}: DashboardCardProps) {
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
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500 mb-0.5">마감일</p>
          <DueDateCell dueDate={task.dueDate} onSave={handleDueDateSave} editable />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 flex-shrink-0"
          aria-label="업무 삭제"
        >
          {deleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
        </button>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">담당자</p>
        <button
          type="button"
          onClick={onOpenDetail}
          className="text-brand-main hover:underline font-medium"
        >
          {task.assigneeDisplayName ?? task.assigneeId.slice(0, 8)}
        </button>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">구분</p>
        <select
          value={task.category}
          onChange={handleCategoryChange}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">업무 내용</p>
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-medium placeholder:text-gray-400 mb-2"
          placeholder="업무 주제"
        />
        <textarea
          value={localDescription}
          onChange={(e) => setLocalDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-y min-h-[4rem]"
          rows={3}
          placeholder="상세 내용 (재검토 지시 시 수정 후 재검토 지시 버튼 클릭)"
        />
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-0.5">우선순위</p>
        <select
          value={task.priority}
          onChange={handlePriorityChange}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="border border-brand-sub/40 rounded-lg bg-brand-light/50 px-3 py-2 space-y-2">
        <p className="text-xs font-semibold text-brand-dark flex items-center gap-1">
          <Paperclip size={14} /> 첨부 파일 {attachments.length > 0 && <span className="text-brand-main">({attachments.length}개)</span>}
        </p>
        {attachments.length === 0 ? (
          <p className="text-xs text-gray-500">없음</p>
        ) : (
          <ul className="space-y-1">
            {attachments.map((att, i) => (
              <li key={i} className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => onDownloadFile(att.downloadUrl, att.fileName)}
                  className="flex items-center gap-1 text-xs text-brand-main hover:underline truncate max-w-full"
                >
                  <FileText size={12} />
                  {att.fileName}
                </button>
                <span className="text-gray-400 text-xs">({formatFileSize(att.fileSize)})</span>
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
        <p className="text-gray-400 text-sm">대기 중</p>
      ) : (
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenDetail}
              className="flex-1 py-2.5 rounded-lg bg-brand-sub text-white text-sm font-medium hover:bg-brand-sub/90"
            >
              내용확인
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-brand-main text-white text-sm font-medium hover:bg-brand-main/90 disabled:opacity-50"
            >
              최종 승인
            </button>
          </div>
          <button
            type="button"
            onClick={handleRevision}
            disabled={revising}
            className="w-full py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
          >
            재검토 지시
          </button>
        </div>
      )}
    </div>
  );
}
