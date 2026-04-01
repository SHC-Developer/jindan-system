import React from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import type { SharedCalendarEvent, SharedCalendarCategory } from '../../types/shared-calendar';
import { formatRecurrenceSummary } from '../../lib/shared-calendar-recurrence';

const CATEGORY_LABELS: Record<SharedCalendarCategory, string> = {
  meeting: '회의',
  field: '현장',
  education: '교육',
  personal_leave: '개인 연차/반차',
};

function formatEventTime(ev: SharedCalendarEvent): string {
  if (ev.startTime && ev.endTime) return `${ev.startTime} ~ ${ev.endTime}`;
  if (ev.startTime) return ev.startTime;
  return '전체일';
}

function formatDateKey(dateKey: string): string {
  return dateKey.replace(/-/g, '.');
}

function formatDateRange(ev: SharedCalendarEvent): string {
  const startKey = ev.startDateKey ?? ev.dateKey;
  const endKey = ev.endDateKey ?? ev.dateKey;
  if (startKey === endKey) return formatDateKey(startKey);
  return `${formatDateKey(startKey)} ~ ${formatDateKey(endKey)}`;
}

export interface EventDetailModalProps {
  open: boolean;
  event: SharedCalendarEvent | null;
  isOwnEvent: boolean;
  /** 반복 시리즈일 때 같은 시리즈(본인) 문서 개수 — 전체 삭제 버튼 문구용 */
  seriesCount?: number;
  onClose: () => void;
  onEdit: () => void;
  /** this: 이 일정만 · series: 같은 recurrenceSeriesId 전부 (반복 해제) */
  onDelete: (scope: 'this' | 'series') => void | Promise<void>;
}

export function EventDetailModal({
  open,
  event,
  isOwnEvent,
  seriesCount = 0,
  onClose,
  onEdit,
  onDelete,
}: EventDetailModalProps) {
  if (!open || !event) return null;

  const recurrenceLabel = formatRecurrenceSummary(event);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl w-[90vw] max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="event-detail-title" className="text-lg font-semibold text-brand-dark">
            일정 상세
          </h2>
          <div className="flex items-center gap-1">
            {isOwnEvent && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
                aria-label="수정"
              >
                <Pencil size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">제목</p>
            <p className="font-medium text-brand-dark">{event.title}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">날짜</p>
            <p className="text-sm text-gray-800">{formatDateRange(event)}</p>
          </div>
          {recurrenceLabel && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">반복</p>
              <p className="text-sm text-gray-800">{recurrenceLabel}</p>
            </div>
          )}
          {event.category && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">카테고리</p>
              <p className="text-sm text-gray-800">{CATEGORY_LABELS[event.category]}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500 mb-0.5">시간</p>
            <p className="text-sm text-gray-800">{formatEventTime(event)}</p>
          </div>
          {event.location && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">장소</p>
              <p className="text-sm text-gray-800">{event.location}</p>
            </div>
          )}
          {event.description && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">설명</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
          {event.createdByName && (
            <div>
              <p className="text-xs text-gray-500 mb-0.5">등록자</p>
              <p className="text-sm text-gray-800">{event.createdByName}</p>
            </div>
          )}
        </div>

        {isOwnEvent && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 space-y-2">
            {event.recurrenceSeriesId && seriesCount > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => void onDelete('this')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px] md:min-h-0"
                >
                  <Trash2 size={16} className="text-gray-500" />
                  이 날짜만 삭제
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete('series')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 min-h-[44px] md:min-h-0"
                >
                  <Trash2 size={16} />
                  반복 일정 전체 삭제 ({seriesCount}건)
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void onDelete('this')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 min-h-[44px] md:min-h-0"
              >
                <Trash2 size={16} />
                일정 삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
