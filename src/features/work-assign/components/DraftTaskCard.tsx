import React from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import type { TaskCategory, TaskPriority } from '../../../types/task';

const CATEGORIES: TaskCategory[] = ['현장', '사무'];
const PRIORITIES: TaskPriority[] = ['1순위', '2순위', '3순위'];

export interface DraftTaskRow {
  key: string;
  dueDate: number | null;
  category: TaskCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  referenceFiles: File[];
}

interface DraftTaskCardProps {
  row: DraftTaskRow;
  index: number;
  onUpdate: (key: string, updates: Partial<Omit<DraftTaskRow, 'key'>>) => void;
  onRemove: (key: string) => void;
  onOpenFileInput: (key: string) => void;
}

export function DraftTaskCard({ row, index, onUpdate, onRemove, onOpenFileInput }: DraftTaskCardProps) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">#{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(row.key)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          aria-label="이 행 삭제"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">마감일</label>
        <input
          type="date"
          value={row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : ''}
          onChange={(e) =>
            onUpdate(row.key, {
              dueDate: e.target.value ? new Date(e.target.value).getTime() : null,
            })
          }
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">구분</label>
        <select
          value={row.category}
          onChange={(e) => onUpdate(row.key, { category: e.target.value as TaskCategory })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">주제</label>
        <input
          type="text"
          value={row.title}
          onChange={(e) => onUpdate(row.key, { title: e.target.value })}
          placeholder="주제 입력"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">업무 상세</label>
        <textarea
          value={row.description}
          onChange={(e) => onUpdate(row.key, { description: e.target.value })}
          placeholder="업무 상세 내용 작성"
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">우선순위</label>
        <select
          value={row.priority}
          onChange={(e) => onUpdate(row.key, { priority: e.target.value as TaskPriority })}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <button
          type="button"
          onClick={() => onOpenFileInput(row.key)}
          className="flex items-center gap-1.5 text-sm text-brand-main hover:underline"
        >
          <Paperclip size={14} /> 파일 첨부
        </button>
        {row.referenceFiles.length > 0 && (
          <p className="text-xs text-gray-600 font-medium mt-1">{row.referenceFiles.length}개 선택됨</p>
        )}
      </div>
    </div>
  );
}
