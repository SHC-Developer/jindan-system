import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserList } from '../../hooks/useUserList';
import type { AppUser } from '../../types/user';
import { Loader2, Users, ChevronRight } from 'lucide-react';

interface PersonnelListPageProps {
  currentUser: AppUser;
}

export function PersonnelListPage({ currentUser }: PersonnelListPageProps) {
  const navigate = useNavigate();
  const { users, loading, error } = useUserList();

  if (loading) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30 flex items-center justify-center">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 직원 목록 불러오는 중…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30 flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-3 md:p-6">
        <div className="flex items-center gap-2 mb-4 md:mb-6">
          <Users size={24} className="text-brand-main" />
          <h1 className="text-xl font-semibold text-brand-dark">인사기록카드</h1>
        </div>
        <p className="text-sm text-gray-600 mb-4">직원을 선택하면 해당 직원의 인사기록카드를 확인·편집할 수 있습니다.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {users.map((u) => (
            <button
              key={u.uid}
              type="button"
              onClick={() => navigate(`/personnel/${u.uid}`)}
              className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 md:p-4 shadow-sm hover:border-brand-main hover:bg-brand-light/20 transition-colors flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-medium text-brand-dark truncate">{u.displayName || '이름 없음'}</p>
                <p className="text-sm text-gray-500 truncate">{u.jobTitle || '-'}</p>
              </div>
              <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
        {users.length === 0 && (
          <p className="text-center text-gray-500 py-8">등록된 직원이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
