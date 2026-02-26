import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList } from '../../hooks/useTaskList';
import type { AppUser } from '../../types/user';
import type { Task } from '../../types/task';
import { PriorityBadge } from './PriorityBadge';
import { DueDateCell } from './DueDateCell';
import { Loader2, FileText, CheckCircle, Circle, AlertCircle } from 'lucide-react';

interface WorkAssignMyListViewProps {
  currentUser: AppUser;
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
    <div className="w-full h-full flex flex-col overflow-hidden bg-brand-light/30">
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col min-h-0 overflow-hidden">
        <div className="flex-shrink-0 px-6 pt-6">
          <div className="py-4 px-4 bg-white border border-gray-200 rounded-t-xl">
            <h2 className="text-lg font-semibold text-brand-dark">내 업무</h2>
            <p className="text-sm text-gray-500 mt-0.5">행을 클릭하면 상세 내용을 확인하고, 파일 첨부 후 완료 제출할 수 있습니다.</p>
          </div>
        </div>
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm border-collapse table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-left font-medium text-gray-700 w-28"># 마감일</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 w-20">구분</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 w-2/5">업무 내용</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 w-24 whitespace-nowrap">재검토 요청</th>
                <th className="py-3 px-4 text-left font-medium text-gray-700 w-28 whitespace-nowrap">우선순위</th>
                <th className="py-3 px-4 text-center font-medium text-gray-700 w-20">완료</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const isRevision = task.status === 'revision';
                return (
                  <tr
                    key={task.id}
                    onClick={() => navigate(`/task/${task.id}`)}
                    className={`border-b border-gray-100 last:border-0 cursor-pointer ${
                      isRevision ? 'bg-amber-50 hover:bg-amber-100/80' : 'hover:bg-brand-sub/5'
                    }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <DueDateCell dueDate={task.dueDate} onSave={() => {}} editable={false} />
                    </td>
                    <td className="py-3 px-4 text-gray-800">{task.category}</td>
                    <td className="py-3 px-4 min-w-0 break-words">
                      <p className="font-medium text-gray-900 break-words">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-500 mt-0.5 break-words line-clamp-2">{task.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isRevision ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 text-xs font-medium">
                          <AlertCircle size={14} />
                          재검토
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      {task.status === 'submitted' || task.status === 'approved' ? (
                        <CheckCircle size={18} className="text-green-600 inline" />
                      ) : (
                        <Circle size={18} className="text-gray-300 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
