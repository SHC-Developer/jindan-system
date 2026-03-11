import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { SharedCalendarEvent, SharedCalendarCategory } from '../../types/shared-calendar';

const CATEGORY_OPTIONS: { value: SharedCalendarCategory; label: string }[] = [
  { value: 'meeting', label: '회의' },
  { value: 'field', label: '현장' },
  { value: 'education', label: '협의/보고 일정' },
];

export interface EventFormValues {
  title: string;
  dateKey: string;
  endDateKey: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  category: SharedCalendarCategory;
}

const defaultValues: EventFormValues = {
  title: '',
  dateKey: '',
  endDateKey: '',
  allDay: true,
  startTime: '09:00',
  endTime: '18:00',
  location: '',
  description: '',
  category: 'meeting',
};

export interface EventFormModalProps {
  open: boolean;
  initialDateKey?: string;
  editEvent?: SharedCalendarEvent | null;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
}

export function EventFormModal({
  open,
  initialDateKey,
  editEvent,
  onClose,
  onSubmit,
}: EventFormModalProps) {
  const [values, setValues] = useState<EventFormValues>(defaultValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      const startKey = editEvent.startDateKey ?? editEvent.dateKey;
      const endKey = editEvent.endDateKey ?? editEvent.dateKey;
      setValues({
        title: editEvent.title,
        dateKey: startKey,
        endDateKey: endKey,
        allDay: !editEvent.startTime,
        startTime: editEvent.startTime ?? '09:00',
        endTime: editEvent.endTime ?? '18:00',
        location: editEvent.location ?? '',
        description: editEvent.description ?? '',
        category: (['meeting', 'field', 'education'].includes(editEvent.category ?? '') ? editEvent.category! : 'meeting'),
      });
    } else {
      const dateKey = initialDateKey ?? new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
      setValues({
        ...defaultValues,
        dateKey,
        endDateKey: dateKey,
        allDay: true,
      });
    }
    setError(null);
  }, [open, initialDateKey, editEvent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) {
      setError('제목을 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...values,
        title,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-form-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-[90vw] max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="event-form-title" className="text-lg font-semibold text-brand-dark">
            {editEvent ? '일정 수정' : '일정 등록'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-1">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                id="event-title"
                type="text"
                value={values.title}
                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                placeholder="일정 제목"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent"
                required
              />
            </div>
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                id="event-date"
                type="date"
                value={values.dateKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setValues((prev) => ({
                    ...prev,
                    dateKey: v,
                    endDateKey: prev.endDateKey < v ? v : prev.endDateKey,
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                종료일 (시작일과 같으면 하루 일정)
              </label>
              <input
                id="event-end-date"
                type="date"
                value={values.endDateKey}
                min={values.dateKey}
                onChange={(e) => setValues((v) => ({ ...v, endDateKey: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 mb-1">
                카테고리
              </label>
              <select
                id="event-category"
                value={values.category}
                onChange={(e) => setValues((v) => ({ ...v, category: e.target.value as SharedCalendarCategory }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="event-allday"
                type="checkbox"
                checked={values.allDay}
                onChange={(e) => setValues((v) => ({ ...v, allDay: e.target.checked }))}
                className="rounded border-gray-300 text-brand-main focus:ring-brand-main"
              />
              <label htmlFor="event-allday" className="text-sm text-gray-700">
                전체일
              </label>
            </div>
            {!values.allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="event-start" className="block text-sm font-medium text-gray-700 mb-1">
                    시작 시간
                  </label>
                  <input
                    id="event-start"
                    type="time"
                    value={values.startTime}
                    onChange={(e) => setValues((v) => ({ ...v, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main"
                  />
                </div>
                <div>
                  <label htmlFor="event-end" className="block text-sm font-medium text-gray-700 mb-1">
                    종료 시간
                  </label>
                  <input
                    id="event-end"
                    type="time"
                    value={values.endTime}
                    onChange={(e) => setValues((v) => ({ ...v, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main"
                  />
                </div>
              </div>
            )}
            <div>
              <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 mb-1">
                장소
              </label>
              <input
                id="event-location"
                type="text"
                value={values.location}
                onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
                placeholder="장소 (선택)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="event-desc" className="block text-sm font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                id="event-desc"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                placeholder="설명 (선택)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-main focus:border-transparent resize-none"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px] md:min-h-0"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-brand-main rounded-lg hover:opacity-90 disabled:opacity-50 min-h-[44px] md:min-h-0"
            >
              {submitting ? '저장 중…' : editEvent ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
