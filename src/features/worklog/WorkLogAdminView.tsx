import React, { useState } from 'react';
import { usePendingWorkLogs } from '../../hooks/useWorkLog';
import { approveWorkLog } from '../../lib/worklog';
import type { AppUser } from '../../types/user';
import { Loader2, Clock, CheckCircle } from 'lucide-react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateLabel(ms: number): string {
  const d = new Date(ms);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const day = WEEKDAY_NAMES[d.getDay()];
  return `${month}월 ${date}일 (${day})`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${ampm}`;
}

interface WorkLogAdminViewProps {
  currentUser: AppUser;
}

export function WorkLogAdminView({ currentUser }: WorkLogAdminViewProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const { workLogs: pendingLogs, loading, error } = usePendingWorkLogs();

  const handleApprove = async (logId: string) => {
    if (approvingId) return;
    setApprovingId(logId);
    try {
      await approveWorkLog(logId, currentUser.uid);
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 승인 대기 목록 불러오는 중…
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

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Clock size={24} className="text-brand-main" />
          <h1 className="text-xl font-semibold text-brand-dark">출퇴근 기록부</h1>
        </div>

        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <h2 className="text-lg font-semibold text-brand-dark px-5 py-4 border-b border-gray-200">
            출근 승인 대기
          </h2>
          <p className="text-sm text-gray-500 px-5 pb-3">
            직원이 출근하기를 누르면 여기에 표시됩니다. 승인하면 해당 직원 화면에 정상 출근으로 반영됩니다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">직원</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">날짜</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">출근 시각</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700 w-24">승인</th>
                </tr>
              </thead>
              <tbody>
                {pendingLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      승인 대기 중인 출근 기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  pendingLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-medium text-gray-800">
                        {log.userDisplayName ?? log.userId.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{formatDateLabel(log.clockInAt)}</td>
                      <td className="py-3 px-4 text-gray-700">{formatTime(log.clockInAt)}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleApprove(log.id)}
                          disabled={approvingId === log.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {approvingId === log.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          승인
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
