import React, { useState } from 'react';
import { useUserList } from '../../hooks/useUserList';
import { useUserDailyJournalList, useDailyJournalOnce } from '../../hooks/useDailyJournal';
import { RichTextEditor } from './RichTextEditor';
import { toDateKeySeoul, getDayOfWeekSeoul } from '../../lib/datetime-seoul';
import type { AppUser } from '../../types/user';
import { Loader2, User } from 'lucide-react';

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

interface UserListItem {
  uid: string;
  displayName: string | null;
  jobTitle: string | null;
  email: string | null;
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
          <div className="flex items-center justify-between mb-4">
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
          <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-6 space-y-4 md:space-y-6">
            <section>
              <h2 className="text-sm font-semibold text-brand-dark mb-2">오늘의 주요 목표</h2>
              <ul className="space-y-2">
                {journal.goals.map((g, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 ${g.checked ? 'line-through text-gray-500' : ''}`}
                  >
                    <input type="checkbox" checked={g.checked} readOnly className="w-4 h-4" />
                    <span>{g.text || '(비어 있음)'}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-brand-dark mb-2">업무 상세 내용</h2>
              <RichTextEditor
                value={journal.detailContent}
                onChange={() => {}}
                readOnly
                className="min-h-[120px]"
              />
            </section>
            <section>
              <h2 className="text-sm font-semibold text-brand-dark mb-2">내일의 계획</h2>
              <p className="whitespace-pre-wrap text-brand-dark bg-gray-50 rounded-lg p-3 min-h-[80px]">
                {journal.tomorrowPlan || '(비어 있음)'}
              </p>
            </section>
            <section>
              <h2 className="text-sm font-semibold text-brand-dark mb-2">기타 메모 및 아이디어</h2>
              <p className="whitespace-pre-wrap text-brand-dark bg-gray-50 rounded-lg p-3 min-h-[80px]">
                {journal.memo || '(비어 있음)'}
              </p>
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
      </div>
    </div>
  );
}
