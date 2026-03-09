import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DueDateCell } from '../DueDateCell';
import { PriorityBadge } from '../PriorityBadge';
import { CheckCircle, Circle, AlertCircle } from 'lucide-react';
import type { Task } from '../../../types/task';

interface MyTaskCardProps {
  task: Task;
}

export function MyTaskCard({ task }: MyTaskCardProps) {
  const navigate = useNavigate();
  const isRevision = task.status === 'revision';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/task/${task.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/task/${task.id}`);
        }
      }}
      className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left cursor-pointer transition-colors ${
        isRevision ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200' : 'hover:bg-brand-sub/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <DueDateCell dueDate={task.dueDate} onSave={() => {}} editable={false} />
        <PriorityBadge priority={task.priority} />
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">구분</p>
      <p className="text-gray-800 mb-3">{task.category}</p>
      <p className="text-xs font-medium text-gray-500 mb-1">업무 내용</p>
      <p className="font-medium text-gray-900 break-words">{task.title}</p>
      {task.description && (
        <p className="text-sm text-gray-500 mt-0.5 break-words line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        {isRevision ? (
          <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
            <AlertCircle size={14} />
            재검토 요청
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
        {task.status === 'submitted' || task.status === 'approved' ? (
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
        ) : (
          <Circle size={20} className="text-gray-300 flex-shrink-0" />
        )}
      </div>
    </div>
  );
}
