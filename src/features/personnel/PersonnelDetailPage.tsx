import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { usePersonnelRecord } from '../../hooks/usePersonnelRecord';
import { useLeaveDays } from '../../hooks/useLeaveDays';
import { setPersonnelRecord } from '../../lib/personnel';
import { useErrorToast } from '../../hooks/useErrorToast';
import type { AppUser } from '../../types/user';
import type { PersonnelBasicInfo, PersonnelRecruitmentInfo, PersonnelResignationInfo } from '../../types/personnel';
import type { PersonnelCareerEntry, PersonnelEducationCert, PersonnelPerformanceEntry } from '../../types/personnel';
import { PersonnelBasicInfoSection } from './components/PersonnelBasicInfoSection';
import { PersonnelRecruitmentSection } from './components/PersonnelRecruitmentSection';
import { PersonnelCareerSection } from './components/PersonnelCareerSection';
import { PersonnelEducationSection } from './components/PersonnelEducationSection';
import { PersonnelPerformanceSection } from './components/PersonnelPerformanceSection';
import { PersonnelResignationSection } from './components/PersonnelResignationSection';
import { PersonnelAnnualLeaveSection } from './components/PersonnelAnnualLeaveSection';

interface PersonnelDetailPageProps {
  userId: string;
  currentUser: AppUser;
  onBack: () => void;
}

export function PersonnelDetailPage({ userId, currentUser, onBack }: PersonnelDetailPageProps) {
  const navigate = useNavigate();
  const { record, loading, error, refetch } = usePersonnelRecord(userId);
  const { items: leaveItems } = useLeaveDays(userId);
  const { showError } = useErrorToast();

  const saveSection = async (
    updates: Partial<{
      basicInfo: PersonnelBasicInfo;
      recruitmentInfo: PersonnelRecruitmentInfo;
      careerHistory: PersonnelCareerEntry[];
      educationCerts: PersonnelEducationCert[];
      performanceRecords: PersonnelPerformanceEntry[];
      resignationInfo: PersonnelResignationInfo;
    }>
  ) => {
    if (!record) return;
    try {
      const merged = { ...record, ...updates };
      await setPersonnelRecord(userId, merged, currentUser.uid);
      await refetch();
    } catch (err) {
      showError('저장 실패', err);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30 flex items-center justify-center">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 인사기록 불러오는 중…
        </p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="w-full h-full overflow-auto bg-brand-light/30 p-3 md:p-6">
        <button type="button" onClick={() => navigate('/personnel')} className="text-sm text-brand-main hover:underline mb-4">← 목록으로</button>
        <p className="text-red-600">{error || '기록을 불러올 수 없습니다.'}</p>
      </div>
    );
  }

  const displayName = record.basicInfo.name || '이름 없음';

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-brand-main hover:underline"
        >
          <ArrowLeft size={16} /> 목록으로
        </button>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h1 className="text-xl font-semibold text-brand-dark">{displayName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">인사기록카드</p>
        </div>

        <PersonnelBasicInfoSection
          data={record.basicInfo}
          onSave={async (data) => saveSection({ basicInfo: data })}
        />
        <PersonnelRecruitmentSection
          data={record.recruitmentInfo}
          onSave={async (data) => saveSection({ recruitmentInfo: data })}
        />
        <PersonnelCareerSection
          items={record.careerHistory}
          onSave={async (items) => saveSection({ careerHistory: items })}
        />
        <PersonnelEducationSection
          items={record.educationCerts}
          onSave={async (items) => saveSection({ educationCerts: items })}
        />
        <PersonnelPerformanceSection
          items={record.performanceRecords}
          onSave={async (items) => saveSection({ performanceRecords: items })}
        />
        <PersonnelResignationSection
          data={record.resignationInfo}
          onSave={async (data) => saveSection({ resignationInfo: data })}
        />
        <PersonnelAnnualLeaveSection hireDate={record.recruitmentInfo.hireDate} leaveItems={leaveItems} />
      </div>
    </div>
  );
}
