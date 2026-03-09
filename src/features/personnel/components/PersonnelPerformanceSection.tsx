import React, { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { PersonnelPerformanceEntry } from '../../../types/personnel';

interface PersonnelPerformanceSectionProps {
  items: PersonnelPerformanceEntry[];
  onSave: (items: PersonnelPerformanceEntry[]) => Promise<void>;
  disabled?: boolean;
}

export function PersonnelPerformanceSection({ items, onSave, disabled }: PersonnelPerformanceSectionProps) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState<PersonnelPerformanceEntry[]>(items.map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const addEntry = () => {
    setList((p) => [...p, { id: `tmp-${Date.now()}`, year: '', grade: '', promotion: '', award: '', discipline: '', notes: '' }]);
  };

  const removeEntry = (id: string) => setList((p) => p.filter((e) => e.id !== id));

  const updateEntry = (id: string, field: keyof PersonnelPerformanceEntry, value: string) => {
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
        <h3 className="text-lg font-semibold text-brand-dark">5. 성과 평가 기록</h3>
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
                <input placeholder="연도" value={entry.year} onChange={(e) => updateEntry(entry.id, 'year', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="등급" value={entry.grade} onChange={(e) => updateEntry(entry.id, 'grade', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="승진" value={entry.promotion} onChange={(e) => updateEntry(entry.id, 'promotion', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="포상" value={entry.award} onChange={(e) => updateEntry(entry.id, 'award', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <input placeholder="징계" value={entry.discipline} onChange={(e) => updateEntry(entry.id, 'discipline', e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                <textarea placeholder="주요 성과·개선 포인트" value={entry.notes} onChange={(e) => updateEntry(entry.id, 'notes', e.target.value)} className="sm:col-span-2 border border-gray-300 rounded px-2 py-1 text-sm min-h-[50px]" />
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
          {items.length === 0 && <p className="text-sm text-gray-500">등록된 성과 기록이 없습니다.</p>}
          {items.map((e) => (
            <li key={e.id} className="text-sm text-gray-800 border-l-2 border-brand-sub pl-3 py-1">
              {e.year}년 등급 {e.grade} {e.promotion && `승진 ${e.promotion}`} {e.award && `포상 ${e.award}`} {e.discipline && `징계 ${e.discipline}`}
              {e.notes && <span className="block text-gray-500 mt-0.5">{e.notes}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
