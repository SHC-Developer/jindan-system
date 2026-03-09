import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PersonnelCareerEntry } from '../../../types/personnel';

interface PersonnelCareerSectionProps {
  items: PersonnelCareerEntry[];
  onSave: (items: PersonnelCareerEntry[]) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelCareerSection({ items, onSave, disabled }: PersonnelCareerSectionProps) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<PersonnelCareerEntry[]>(items.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const addEntry = () => {
    setList((p) => [...p, { id: `tmp-${Date.now()}`, startDate: '', endDate: '', department: '', position: '', notes: '' }]);
  };

  const removeEntry = (id: string) => {
    setList((p) => p.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof PersonnelCareerEntry, value: string) => {
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
        <h3 className="text-lg font-semibold text-brand-dark">3. 경력 및 직무 이동</h3>
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
        <div className="space-y-4">
          {list.map((entry) => (
            <div key={entry.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex justify-end">
                <button type="button" onClick={() => removeEntry(entry.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input placeholder="시작일 (YYYY-MM-DD)" value={entry.startDate} onChange={(e) => updateEntry(entry.id, 'startDate', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="종료일 (YYYY-MM-DD)" value={entry.endDate} onChange={(e) => updateEntry(entry.id, 'endDate', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="부서" value={entry.department} onChange={(e) => updateEntry(entry.id, 'department', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="직책/직무" value={entry.position} onChange={(e) => updateEntry(entry.id, 'position', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <textarea placeholder="메모" value={entry.notes} onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)} className="sm:col-span-2 border border-gray-300 rounded px-2 py-1 text-sm min-h-[50px]" />
              </div>
            </div>
          ))}
          <button type="button" onClick={addEntry} className="flex items-center gap-1 text-sm text-brand-main hover:underline">
            <Plus size={14} /> 항목 추가
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setEditing(false); setList(items.map((i) => ({ ...i }))); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-3 py-1.5 text-sm rounded-lg bg-brand-main text-white">{saving ? '저장 중…' : '저장'}</button>
          </div>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-500">등록된 경력이 없습니다.</p>}
          {items.map((e) => (
            <li key={e.id} className="text-sm text-gray-800 border-l-2 border-brand-sub pl-3 py-1">
              {e.startDate} ~ {e.endDate} {e.department} {e.position}
              {e.notes && <span className="block text-gray-500 mt-0.5">{e.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
