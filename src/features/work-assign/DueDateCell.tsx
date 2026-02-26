import React, { useState } from 'react';

function formatDueDate(ms: number | null): string {
  if (!ms) return '-';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateString(s: string): number | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

interface DueDateCellProps {
  dueDate: number | null;
  onSave: (dueDate: number | null) => void;
  editable: boolean;
}

export function DueDateCell({ dueDate, onSave, editable }: DueDateCellProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(formatDueDate(dueDate));

  const handleSubmit = () => {
    const next = parseDateString(value);
    onSave(next);
    setEditing(false);
  };

  if (!editable) {
    return <span className="text-sm text-brand-dark">{formatDueDate(dueDate)}</span>;
  }

  if (editing) {
    return (
      <input
        type="date"
        value={value === '-' ? '' : value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        className="text-sm border border-gray-300 rounded px-2 py-1 w-full max-w-[140px]"
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-sm text-brand-main hover:underline text-left w-full"
    >
      {formatDueDate(dueDate)}
    </button>
  );
}
