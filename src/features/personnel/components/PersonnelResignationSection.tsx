import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { PersonnelResignationInfo } from '../../../types/personnel';

interface PersonnelResignationSectionProps {
  data: PersonnelResignationInfo;
  onSave: (data: PersonnelResignationInfo) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelResignationSection({ data, onSave, disabled }: PersonnelResignationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonnelResignationInfo>({ ...data });
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
        <h3 className="text-lg font-semibold text-brand-dark">6. 퇴직 정보</h3>
        {!disabled && (
          <button type="button" onClick={() => (editing ? handleSave() : setEditing(true))} disabled={saving} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand-main" aria-label="편집">
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">퇴직일</label>
            <input type="text" value={form.resignDate} onChange={(e) => setForm((p) => ({ ...p, resignDate: e.target.value }))} placeholder="YYYY-MM-DD" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">퇴직 사유</label>
            <input type="text" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">퇴직 절차 기록</label>
            <textarea value={form.procedure} onChange={(e) => setForm((p) => ({ ...p, procedure: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditing(false); setForm({ ...data }); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-brand-main text-white">{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <dt className="text-gray-500">퇴직일</dt>
          <dd className="text-gray-800">{data.resignDate || '-'}</dd>
          <dt className="text-gray-500">퇴직 사유</dt>
          <dd className="text-gray-800">{data.reason || '-'}</dd>
          {data.procedure && <><dt className="text-gray-500 sm:col-span-2">퇴직 절차 기록</dt><dd className="text-gray-800 sm:col-span-2">{data.procedure}</dd></>}
        </dl>
      )}
    </section>
  );
}
