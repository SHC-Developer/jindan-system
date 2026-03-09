import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PersonnelEducationCert } from '../../../types/personnel';

interface PersonnelEducationSectionProps {
  items: PersonnelEducationCert[];
  onSave: (items: PersonnelEducationCert[]) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelEducationSection({ items, onSave, disabled }: PersonnelEducationSectionProps) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<PersonnelEducationCert[]>(items.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const addEntry = () => {
    setList((p) => [...p, { id: `tmp-${Date.now()}`, date: '', name: '', category: '', issuer: '', result: '', renewalDate: '' }]);
  };

  const removeEntry = (id: string) => setList((p) => p.filter((e) => e.id !== id));

  const updateEntry = (id: string, field: keyof PersonnelEducationCert, value: string) => {
    setList((p) => p.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(list);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-dark">4. 교육 및 자격증</h3>
        {!disabled && (
          <button type="button" onClick={() => (editing ? handleSave() : setEditing(true))} disabled={saving} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-brand-main" aria-label="편집">
            <Pencil size={16} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-4">
          {list.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-end">
                <button type="button" onClick={() => removeEntry(entry.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input placeholder="일자" value={entry.date} onChange={(e) => updateEntry(entry.id, 'date', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="명칭" value={entry.name} onChange={(e) => updateEntry(entry.id, 'name', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="구분" value={entry.category} onChange={(e) => updateEntry(entry.id, 'category', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="발급기관" value={entry.issuer} onChange={(e) => updateEntry(entry.id, 'issuer', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="결과" value={entry.result} onChange={(e) => updateEntry(entry.id, 'result', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="갱신일" value={entry.renewalDate} onChange={(e) => updateEntry(entry.id, 'renewalDate', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addEntry} className="flex items-center gap-1 text-sm text-brand-main hover:underline"><Plus size={14} /> 항목 추가</button>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditing(false); setList(items.map((i) => ({ ...i }))); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-brand-main text-white">{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-500">등록된 교육·자격이 없습니다.</p>}
          {items.map((e) => (
            <li key={e.id} className="text-sm text-gray-800">
              {e.date} {e.name} {e.category && `(${e.category})`} {e.issuer && `- ${e.issuer}`} {e.result && ` ${e.result}`} {e.renewalDate && `갱신 ${e.renewalDate}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
