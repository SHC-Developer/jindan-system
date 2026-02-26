import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList } from '../../hooks/useTaskList';
import type { AppUser } from '../../types/user';
import type { Task } from '../../types/task';
import { Loader2, FileText, CheckCircle, Circle } from 'lucide-react';

interface WorkAssignMyListViewProps {
  currentUser: AppUser;
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkAssignMyListView({ currentUser }: WorkAssignMyListViewProps) {
  const navigate = useNavigate();
  const { tasks, loading, error } = useTaskList(currentUser.uid);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 업무 목록 불러오는 중…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-brand-light/30 p-6 text-center">
        <FileText size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium">받은 업무가 없습니다</p>
        <p className="text-sm text-gray-500 mt-1">관리자가 지시한 업무가 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-brand-light/30">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-brand-dark">내 업무</h2>
        <p className="text-sm text-gray-500 mt-0.5">클릭하면 상세 내용을 확인할 수 있습니다.</p>
      </div>
      <ul className="flex-1 overflow-y-auto p-4 space-y-2">
        {tasks.map((task) => (
          <TaskListItem key={task.id} task={task} onSelect={() => navigate(`/task/${task.id}`)} />
        ))}
      </ul>
    </div>
  );
}

function TaskListItem({
  task,
  onSelect,
}: {
  task: Task;
  onSelect: () => void;
  key?: string;
}) {
  const isCompleted = task.status === 'completed';

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-brand-sub hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isCompleted ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <Circle size={20} className="text-gray-300" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>
              {task.title}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {task.createdByDisplayName ?? '관리자'} · {formatDate(task.createdAt)}
              {task.priority && ` · ${task.priority}`}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}
