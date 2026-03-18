import React, { useState } from 'react';
import { useUserList, type UserListItem } from '../../hooks/useUserList';
import { useUserDailyJournalList, useDailyJournalOnce } from '../../hooks/useDailyJournal';
import { RichTextEditor } from './RichTextEditor';
import { toDateKeySeoul, getDayOfWeekSeoul } from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import { Loader2, User, ListChecks, FileText, Lightbulb } from 'lucide-react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const NOTEPAD_ICON = `${import.meta.env.BASE_URL}notepad.png`;

function formatDateKeyLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ms = new Date(dateKey + 'T12:00:00+09:00').getTime();
  const dayName = WEEKDAY_NAMES[getDayOfWeekSeoul(ms)];
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

function formatDateKeySlash(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${y}/${m}/${d}`;
}

interface DailyJournalAdminViewProps {
  currentUser: AppUser;
}

export function DailyJournalAdminView({ currentUser }: DailyJournalAdminViewProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<UserListItem | null>(null);
  const [viewingDateKey, setViewingDateKey] = useState<string | null>(null);

  const { users, loading: usersLoading, error: usersError } = useUserList();
  const { items, loading: listLoading, error: listError } = useUserDailyJournalList(
    selectedEmployee?.uid ?? null
  );
  const { journal, loading: docLoading } = useDailyJournalOnce(
    selectedEmployee?.uid ?? null,
    viewingDateKey
  );

  const handleBackToEmployeeList = () => {
    setSelectedEmployee(null);
    setViewingDateKey(null);
  };

  const handleBackToList = () => {
    setViewingDateKey(null);
  };

  if (viewingDateKey && journal) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30">
        <div className="max-w-6xl mx-auto p-3 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <button
              type="button"
              onClick={handleBackToList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              ← 목록
            </button>
            <span className="font-semibold text-brand-dark">
              {selectedEmployee?.displayName ?? selectedEmployee?.uid.slice(0, 8)} · {formatDateKeyLong(viewingDateKey)}
            </span>
          </div>

          <section className="mb-4 md:mb-6">
            <span className="text-xl md:text-2xl font-bold text-brand-dark">
              {formatDateKeyLong(viewingDateKey)}
            </span>
          </section>

          {/* 업무일지 작성과 동일한 2열 레이아웃: 좌 목표·내일·메모 / 우 업무 상세 */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4 md:gap-6 mb-4 md:mb-6 lg:h-[640px] lg:items-stretch lg:overflow-hidden">
            <div className="flex flex-col min-h-[320px] lg:h-full lg:min-h-0 lg:overflow-hidden">
              <div className="flex-1 min-h-0 flex flex-col gap-4 md:gap-6 overflow-y-auto">
                <section className="flex-shrink-0">
                  <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2">
                    <ListChecks size={18} className="text-brand-sub" />
                    오늘의 주요 목표
                  </h2>
                  <ul className="space-y-2">
                    {journal.goals.map((g, i) => (
                      <li
                        key={i}
                        className={`flex items-center gap-2 ${g.checked ? 'line-through text-gray-500' : ''}`}
                      >
                        <input type="checkbox" checked={g.checked} readOnly className="w-5 h-5 rounded border-gray-300 flex-shrink-0" />
                        <span className="text-brand-dark">{g.text || '(비어 있음)'}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="flex-shrink-0">
                  <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2">
                    <Lightbulb size={18} className="text-brand-sub" />
                    내일의 계획
                  </h2>
                  <p className="whitespace-pre-wrap text-brand-dark border border-gray-200 rounded-lg bg-white px-3 py-2 min-h-0">
                    {journal.tomorrowPlan || '(비어 있음)'}
                  </p>
                </section>
                <section className="flex-shrink-0">
                  <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2">
                    <Lightbulb size={18} className="text-brand-sub" />
                    기타 메모 및 아이디어
                  </h2>
                  <p className="whitespace-pre-wrap text-brand-dark border border-gray-200 rounded-lg bg-white px-3 py-2 min-h-0">
                    {journal.memo || '(비어 있음)'}
                  </p>
                </section>
              </div>
            </div>
            <section className="flex flex-col min-h-[320px] lg:h-full lg:min-h-0 overflow-hidden">
              <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2 flex-shrink-0">
                <FileText size={18} className="text-brand-sub" />
                업무 상세 내용
              </h2>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <RichTextEditor
                  value={journal.detailContent}
                  onChange={() => {}}
                  readOnly
                  className="h-full flex flex-col overflow-hidden"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (selectedEmployee) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30">
        <div className="max-w-6xl mx-auto p-3 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <button
              type="button"
              onClick={handleBackToEmployeeList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              ← 목록
            </button>
            <h2 className="text-lg font-semibold text-brand-dark">
              {selectedEmployee.displayName ?? selectedEmployee.uid.slice(0, 8)} 업무일지
            </h2>
          </div>
          {listLoading ? (
            <p className="flex items-center gap-2 text-gray-500">
              <Loader2 size={18} className="animate-spin" /> 불러오는 중…
            </p>
          ) : listError ? (
            <p className="text-red-600 text-sm">{listError}</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500 text-sm">저장된 업무일지가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {items.map(({ id, dateKey }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewingDateKey(dateKey)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-brand-sub hover:bg-brand-sub/5 text-left transition-colors flex-shrink-0"
                >
                  <img
                    src={NOTEPAD_ICON}
                    alt=""
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                  <span className="font-medium text-brand-dark">
                    {formatDateKeySlash(dateKey)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-6xl mx-auto p-3 md:p-6">
        <h2 className="text-lg font-semibold text-brand-dark mb-3">업무일지를 확인할 직원을 선택하세요</h2>
        {usersLoading ? (
          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> 직원 목록 불러오는 중…
          </p>
        ) : usersError ? (
          <p className="text-sm text-red-600">{usersError}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500">역할이 일반인 사용자가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {users.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => setSelectedEmployee(u)}
                className="flex flex-col items-center gap-2 p-3 md:p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-brand-sub hover:bg-brand-sub/5 text-brand-dark transition-colors"
              >
                {u.photoURL ? (
                  <img
                    src={u.photoURL}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-brand-light"
                  />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-brand-light flex items-center justify-center text-brand-main">
                    <User size={24} />
                  </span>
                )}
                <span className="text-sm font-medium truncate w-full text-center">
                  {u.displayName ?? u.uid.slice(0, 8)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
