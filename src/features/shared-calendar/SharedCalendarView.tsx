import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getDayOfWeekSeoul } from '../../lib/datetime-seoul';
import { getHolidayDateKeys } from '../../lib/kr-holidays';
import { useSharedCalendarEvents } from '../../hooks/useSharedCalendarEvents';
import { useApprovedLeaveDays } from '../../hooks/useApprovedLeaveDays';
import { notifyAllUsers } from '../../lib/notifications';
import { EventFormModal, type EventFormValues } from './EventFormModal';
import { EventDetailModal } from './EventDetailModal';
import type { AppUser } from '../../types/user';
import type { SharedCalendarEvent } from '../../types/shared-calendar';
import { CATEGORY_COLORS } from '../../types/shared-calendar';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

interface SharedCalendarViewProps {
  currentUser: AppUser;
}

export function SharedCalendarView({ currentUser }: SharedCalendarViewProps) {
  const { events, loading, error, createEvent, updateEvent, deleteEvent } = useSharedCalendarEvents();
  const approvedLeaveDays = useApprovedLeaveDays();
  const [calendarMonth, setCalendarMonth] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }).slice(0, 7)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SharedCalendarEvent | null>(null);
  const [addModalDateKeyOverride, setAddModalDateKeyOverride] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<SharedCalendarEvent | null>(null);
  const [holidayDateKeys, setHolidayDateKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const [y, m] = calendarMonth.split('-').map(Number);
    const years: number[] = [y];
    if (m === 1) years.unshift(y - 1);
    if (m === 12) years.push(y + 1);
    let cancelled = false;
    Promise.all(years.map((yr) => getHolidayDateKeys(yr)))
      .then((sets) => {
        if (cancelled) return;
        const merged = new Set<string>();
        sets.forEach((s) => s.forEach((k) => merged.add(k)));
        setHolidayDateKeys(merged);
      });
    return () => {
      cancelled = true;
    };
  }, [calendarMonth]);

  const allEvents = useMemo(() => {
    const sharedOnly = events.filter((e) => !e.sourceLeaveUserId);
    return [...sharedOnly, ...approvedLeaveDays];
  }, [events, approvedLeaveDays]);

  const singleDayEventsByDateKey = useMemo(() => {
    const m = new Map<string, SharedCalendarEvent[]>();
    allEvents.forEach((ev) => {
      const startKey = ev.startDateKey ?? ev.dateKey;
      const endKey = ev.endDateKey ?? ev.dateKey;
      if (startKey !== endKey) return;
      const list = m.get(startKey) ?? [];
      list.push(ev);
      m.set(startKey, list);
    });
    return m;
  }, [allEvents]);

  const multiDayEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      const startKey = ev.startDateKey ?? ev.dateKey;
      const endKey = ev.endDateKey ?? ev.dateKey;
      return startKey !== endKey;
    });
  }, [allEvents]);

  const [year, month] = calendarMonth.split('-').map(Number);
  const firstDayMs = new Date(`${year}-${String(month).padStart(2, '0')}-01T12:00:00+09:00`).getTime();
  const startPad = getDayOfWeekSeoul(firstDayMs);
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate();
  const calendarDays: { dateKey: string; day: number; isCurrentMonth: boolean }[] = [];
  for (let i = 0; i < startPad; i++) {
    const d = daysInPrevMonth - startPad + i + 1;
    const dateKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 0; i < remaining; i++) {
    const d = i + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const dateKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dateKey, day: d, isCurrentMonth: false });
  }

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

  const handleDateClick = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
  }, []);

  const handleOpenAddModal = useCallback((dateKeyOverride?: string) => {
    setEditingEvent(null);
    setAddModalDateKeyOverride(dateKeyOverride ?? null);
    setModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((ev: SharedCalendarEvent) => {
    setDetailEvent(null);
    setEditingEvent(ev);
    setModalOpen(true);
  }, []);

  const handleOpenDetailModal = useCallback((ev: SharedCalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDetailEvent(ev);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailEvent(null);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    setAddModalDateKeyOverride(null);
  }, []);

  const handleFormSubmit = useCallback(
    async (values: EventFormValues) => {
      const startKey = values.dateKey;
      const endKey = values.endDateKey || values.dateKey;
      const payload = {
        title: values.title.trim(),
        dateKey: startKey,
        startDateKey: startKey,
        endDateKey: endKey,
        startTime: values.allDay ? undefined : values.startTime,
        endTime: values.allDay ? undefined : values.endTime,
        description: values.description.trim() || undefined,
        location: values.location.trim() || undefined,
        category: values.category,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName ?? undefined,
      };
      if (editingEvent) {
        await updateEvent(editingEvent.id, {
          title: payload.title,
          dateKey: payload.dateKey,
          startDateKey: payload.startDateKey,
          endDateKey: payload.endDateKey,
          startTime: payload.startTime,
          endTime: payload.endTime,
          description: payload.description,
          location: payload.location,
          category: payload.category,
        });
      } else {
        await createEvent(payload);
        await notifyAllUsers(
          {
            type: 'shared_calendar_event',
            title: '공유일정 등록',
            sharedCalendarEventTitle: payload.title,
            sharedCalendarEventUserDisplayName: currentUser.displayName ?? undefined,
          },
          currentUser.uid
        );
      }
    },
    [currentUser.uid, currentUser.displayName, editingEvent, createEvent, updateEvent]
  );

  const handleDelete = useCallback(
    async (ev: SharedCalendarEvent) => {
      if (ev.id.startsWith('leave-')) return;
      if (ev.createdBy !== currentUser.uid) return;
      if (!window.confirm(`"${ev.title}" 일정을 삭제하시겠습니까?`)) return;
      try {
        await deleteEvent(ev.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
      }
    },
    [currentUser.uid, deleteEvent]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-gray-500 flex items-center gap-2">
          <Loader2 size={18} className="animate-spin" /> 공유 일정을 불러오는 중…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light/30">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-brand-light/30">
      <div className="max-w-4xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        <h1 className="text-xl font-semibold text-brand-dark">
          공유일정 캘린더 <span className="text-sm font-normal text-gray-500">(날짜를 클릭하면 일정 등록 가능)</span>
        </h1>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-brand-dark">일정</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map(Number);
                  if (m <= 1) setCalendarMonth(`${y - 1}-12`);
                  else setCalendarMonth(`${y}-${String(m - 1).padStart(2, '0')}`);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
              >
                이전
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
                {year}년 {month}월
              </span>
              <button
                type="button"
                onClick={() => {
                  const [y, m] = calendarMonth.split('-').map(Number);
                  if (m >= 12) setCalendarMonth(`${y + 1}-01`);
                  else setCalendarMonth(`${y}-${String(m + 1).padStart(2, '0')}`);
                }}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded min-w-[44px] min-h-[44px] flex items-center justify-center md:min-w-0 md:min-h-0"
              >
                다음
              </button>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 text-sm">
              {WEEKDAY_NAMES.map((w, i) => (
                <div
                  key={w}
                  className={`py-1 font-medium text-center ${
                    i === 0
                      ? 'text-[var(--color-calendar-sun)]'
                      : i === 6
                        ? 'text-[var(--color-calendar-sat)]'
                        : 'text-gray-600'
                  }`}
                >
                  {w}
                </div>
              ))}
              {Array.from({ length: 6 }, (_, weekIdx) => {
                const weekStart = weekIdx * 7;
                const weekCells = calendarDays.slice(weekStart, weekStart + 7);
                const weekDateKeys = weekCells.map((c) => c.dateKey);
                const weekMultiDay = multiDayEvents.filter((ev) => {
                  const startKey = ev.startDateKey ?? ev.dateKey;
                  const endKey = ev.endDateKey ?? ev.dateKey;
                  return weekDateKeys.some(
                    (dk) => dk >= startKey && dk <= endKey
                  );
                });
                const barRowCount = Math.min(weekMultiDay.length, 4);
                const weekRowCount = barRowCount + 2;
                return (
                  <div
                    key={weekIdx}
                    className="col-span-7 grid gap-1 min-h-[90px] p-1 -mx-1"
                    style={{
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gridTemplateRows: `repeat(${weekRowCount}, minmax(0, auto))`,
                    }}
                  >
                    {weekCells.map(({ dateKey, day, isCurrentMonth }, colIdx) => {
                      const dayMs = new Date(dateKey + 'T12:00:00+09:00').getTime();
                      const dayOfWeek = getDayOfWeekSeoul(dayMs);
                      const isSun = dayOfWeek === 0;
                      const isSat = dayOfWeek === 6;
                      const isHoliday = holidayDateKeys.has(dateKey);
                      const isRed = isSun || isHoliday;
                      const isBlue = isSat && !isHoliday;
                      const dayColor = !isCurrentMonth
                        ? 'text-gray-300'
                        : isRed
                          ? 'text-[var(--color-calendar-sun)]'
                          : isBlue
                            ? 'text-[var(--color-calendar-sat)]'
                            : 'text-gray-800';
                      return (
                        <button
                          key={`day-${dateKey}`}
                          type="button"
                          onClick={() => {
                            handleDateClick(dateKey);
                            handleOpenAddModal(dateKey);
                          }}
                          className={`p-1 rounded-t-md flex flex-col items-stretch text-left transition-colors hover:bg-gray-100 cursor-pointer ${dayColor} ${dateKey === todayKey && selectedDateKey !== dateKey ? 'ring-2 ring-brand-main ring-inset' : ''}`}
                          style={{ gridColumn: colIdx + 1, gridRow: 1 }}
                        >
                          <span className="text-sm font-medium">
                            {day}
                            {isHoliday && isCurrentMonth && (
                              <span className="ml-0.5 text-[10px] opacity-80" title="공휴일">휴</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                    {weekMultiDay.slice(0, 4).map((ev, rowIdx) => {
                      const startKey = ev.startDateKey ?? ev.dateKey;
                      const endKey = ev.endDateKey ?? ev.dateKey;
                      let startCol = 7;
                      let endCol = -1;
                      weekDateKeys.forEach((dk, ci) => {
                        if (dk >= startKey && dk <= endKey) {
                          startCol = Math.min(startCol, ci);
                          endCol = Math.max(endCol, ci);
                        }
                      });
                      if (endCol < 0) return null;
                      const catClass = ev.category && CATEGORY_COLORS[ev.category];
                      const barClass = catClass ?? 'bg-brand-sub/20 text-brand-dark';
                      return (
                        <div
                          key={ev.id}
                          role="button"
                          tabIndex={0}
                          className={`text-xs truncate rounded px-1 py-0.5 cursor-pointer text-center leading-5 ${barClass}`}
                          style={{
                            gridColumn: `${startCol + 1} / ${endCol + 2}`,
                            gridRow: rowIdx + 2,
                          }}
                          onClick={(e) => handleOpenDetailModal(ev, e)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleOpenDetailModal(ev, e as unknown as React.MouseEvent);
                            }
                          }}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {weekCells.map(({ dateKey }, colIdx) => {
                      const dayEvents = singleDayEventsByDateKey.get(dateKey) ?? [];
                      const isSelected = selectedDateKey === dateKey;
                      const maxVisibleDesktop = 3;
                      const maxVisibleMobile = 2;
                      const visibleEventsDesktop = dayEvents.slice(0, maxVisibleDesktop);
                      const overflowDesktop = dayEvents.length > maxVisibleDesktop;
                      const overflowMobile = dayEvents.length > maxVisibleMobile;
                      return (
                        <div
                          key={`ev-${dateKey}`}
                          className={`p-1 flex flex-col items-stretch text-left rounded min-h-0 ${isSelected ? 'rounded-b-md' : ''}`}
                          style={{
                            gridColumn: colIdx + 1,
                            gridRow: barRowCount + 2,
                          }}
                        >
                          <div className="flex-1 mt-0.5 space-y-0.5 overflow-hidden min-w-0">
                            {dayEvents.length === 0 ? null : (
                              <>
                                {visibleEventsDesktop.map((ev, idx) => {
                                  const catClass = ev.category && CATEGORY_COLORS[ev.category];
                                  const badgeClass = catClass ?? 'bg-brand-sub/20 text-brand-dark';
                                  return (
                                    <div
                                      key={ev.id}
                                      role="button"
                                      tabIndex={0}
                                      className={`text-xs truncate rounded px-1 py-0.5 cursor-pointer leading-5 ${badgeClass} ${idx >= maxVisibleMobile ? 'hidden md:block' : ''}`}
                                      onClick={(e) => handleOpenDetailModal(ev, e)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          handleOpenDetailModal(ev, e as unknown as React.MouseEvent);
                                        }
                                      }}
                                    >
                                      {ev.title}
                                    </div>
                                  );
                                })}
                                {overflowMobile && (
                                  <span className="text-xs text-gray-500 md:hidden">
                                    +{dayEvents.length - maxVisibleMobile}
                                  </span>
                                )}
                                {overflowDesktop && (
                                  <span className="text-xs text-gray-500 hidden md:inline">
                                    +{dayEvents.length - maxVisibleDesktop}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {weekCells.map(({ dateKey }, colIdx) => (
                      <div
                        key={`border-${dateKey}`}
                        aria-hidden
                        className={`pointer-events-none rounded-md transition-colors ${
                          selectedDateKey === dateKey ? 'border-2 border-brand-main' : ''
                        }`}
                        style={{
                          gridColumn: colIdx + 1,
                          gridRow: `1 / ${weekRowCount + 1}`,
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <EventFormModal
        open={modalOpen}
        initialDateKey={addModalDateKeyOverride ?? selectedDateKey ?? undefined}
        editEvent={editingEvent}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
      />
      <EventDetailModal
        open={!!detailEvent}
        event={detailEvent}
        isOwnEvent={detailEvent ? detailEvent.createdBy === currentUser.uid && !detailEvent.id.startsWith('leave-') : false}
        onClose={handleCloseDetailModal}
        onEdit={() => {
          if (detailEvent) {
            handleCloseDetailModal();
            handleOpenEditModal(detailEvent);
          }
        }}
        onDelete={() => {
          if (detailEvent) {
            handleCloseDetailModal();
            handleDelete(detailEvent);
          }
        }}
      />
    </div>
  );
}
