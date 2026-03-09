import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { PersonnelBasicInfo } from '../../../types/personnel';

interface PersonnelBasicInfoSectionProps {
  data: PersonnelBasicInfo;
  onSave: (data: PersonnelBasicInfo) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelBasicInfoSection({ data, onSave, disabled }: PersonnelBasicInfoSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonnelBasicInfo>({ ...data });
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
        <h3 className="text-lg font-semibold text-brand-dark">1. 기본 정보</h3>
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
          {(['name', 'nameEn', 'residentNumber', 'phone', 'address', 'email'] as const).map((key) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-500 mb-0.5">
                {key === 'name' && '이름'}
                {key === 'nameEn' && '영문명'}
                {key === 'residentNumber' && '주민등록번호'}
                {key === 'phone' && '연락처'}
                {key === 'address' && '주소'}
                {key === 'email' && '이메일'}
              </label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={() => { setEditing(false); setForm({ ...data }); }}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg bg-brand-main text-white"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-2 text-sm">
          <Item label="이름" value={data.name} />
          <Item label="영문명" value={data.nameEn} />
          <Item label="주민등록번호" value={data.residentNumber} />
          <Item label="연락처" value={data.phone} />
          <Item label="주소" value={data.address} />
          <Item label="이메일" value={data.email} />
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
