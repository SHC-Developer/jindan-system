import type { TaskPriority } from '../../types/task';

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  '1순위': 'bg-brand-main text-white',
  '2순위': 'bg-brand-sub text-white',
  '3순위': 'bg-brand-dark text-white',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {priority}
    </span>
  );
}
