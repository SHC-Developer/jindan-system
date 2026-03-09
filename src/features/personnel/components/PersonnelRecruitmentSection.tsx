import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { PersonnelRecruitmentInfo } from '../../../types/personnel';

interface PersonnelRecruitmentSectionProps {
  data: PersonnelRecruitmentInfo;
  onSave: (data: PersonnelRecruitmentInfo) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelRecruitmentSection({ data, onSave, disabled }: PersonnelRecruitmentSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonnelRecruitmentInfo>({ ...data });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-dark">2. 채용 정보</h3>
        {!disabled && (
          <button
            type="button"
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand-main"
            aria-label="편집"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(['hireDate', 'channel', 'initialDepartment', 'initialPosition'] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                {key === 'hireDate' && '입사일'}
                {key === 'channel' && '채용 경로'}
                {key === 'initialDepartment' && '초기 부서'}
                {key === 'initialPosition' && '초기 직무'}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={key === 'hireDate' ? 'YYYY-MM-DD' : ''}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">역량·면접 메모</label>
            <textarea
              value={form.competencyNotes}
              onChange={(e) => setForm((p) => ({ ...p, competencyNotes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px]"
              placeholder="채용 과정 평가 메모"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-0.5">면접 평가 메모</label>
            <textarea
              value={form.interviewNotes}
              onChange={(e) => setForm((p) => ({ ...p, interviewNotes: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px]"
            />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="button" onClick={() => { setEditing(false); setForm({ ...data }); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-brand-main text-white">{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <Item label="입사일" value={data.hireDate} />
          <Item label="채용 경로" value={data.channel} />
          <Item label="초기 부서" value={data.initialDepartment} />
          <Item label="초기 직무" value={data.initialPosition} />
          {data.competencyNotes && <><dt className="text-gray-500 sm:col-span-2">역량·면접 메모</dt><dd className="text-gray-800 sm:col-span-2">{data.competencyNotes}</dd></>}
          {data.interviewNotes && <><dt className="text-gray-500 sm:col-span-2">면접 평가 메모</dt><dd className="text-gray-800 sm:col-span-2">{data.interviewNotes}</dd></>}
        </dl>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-800">{value || '-'}</dd>
    </>
  );
}
