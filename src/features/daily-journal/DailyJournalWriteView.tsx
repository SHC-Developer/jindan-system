import React, { useState, useEffect, useCallback } from 'react';
import { toDateKeySeoul, getDayOfWeekSeoul } from '../../lib/datetime-seoul';
import { useMyDailyJournals, useDailyJournalOnce } from '../../hooks/useDailyJournal';
import { saveDailyJournal } from '../../lib/dailyJournal';
import { createEmptyGoals } from '../../types/dailyJournal';
import type { DailyJournalGoal } from '../../types/dailyJournal';
import type { AppUser } from '../../types/user';
import { RichTextEditor } from './RichTextEditor';
import { Loader2, Plus, Minus, FileText, ListChecks, Lightbulb, History } from 'lucide-react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateKeyLong(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ms = new Date(dateKey + 'T12:00:00+09:00').getTime();
  const dayName = WEEKDAY_NAMES[getDayOfWeekSeoul(ms)];
  return `${y}년 ${m}월 ${d}일 (${dayName})`;
}

function formatDateKeySlash(dateKey: string): string {
  const [y, m, d] = dateKey.split('-');
  return `${y}/${m}/${d}`;
}

const DEFAULT_GOAL_COUNT = 3;
const NOTEPAD_ICON = `${import.meta.env.BASE_URL}notepad.png`;

interface DailyJournalWriteViewProps {
  currentUser: AppUser;
}

type ViewMode = 'write' | 'list';

export function DailyJournalWriteView({ currentUser }: DailyJournalWriteViewProps) {
  const todayKey = toDateKeySeoul(Date.now());
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const [editingDateKey, setEditingDateKey] = useState<string>(todayKey);
  /** 당일만 수정 가능, 지난 날짜는 읽기 전용 */
  const isEditingToday = editingDateKey === todayKey;
  const [goals, setGoals] = useState<DailyJournalGoal[]>(() => createEmptyGoals(DEFAULT_GOAL_COUNT));
  const [detailContent, setDetailContent] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { items, loading: listLoading, error: listError } = useMyDailyJournals(currentUser.uid);
  const { journal, loading: docLoading, refetch } = useDailyJournalOnce(
    currentUser.uid,
    viewMode === 'write' ? editingDateKey : null
  );

  const [hasSyncedFromJournal, setHasSyncedFromJournal] = useState(false);

  useEffect(() => {
    if (docLoading) return;
    if (journal) {
      setGoals(journal.goals.length > 0 ? journal.goals : createEmptyGoals(DEFAULT_GOAL_COUNT));
      setDetailContent(journal.detailContent);
      setTomorrowPlan(journal.tomorrowPlan);
      setMemo(journal.memo);
      setHasSyncedFromJournal(true);
    } else {
      setGoals(createEmptyGoals(DEFAULT_GOAL_COUNT));
      setDetailContent('');
      setTomorrowPlan('');
      setMemo('');
      setHasSyncedFromJournal(false);
    }
  }, [journal, editingDateKey, docLoading]);

  const addGoal = useCallback(() => {
    setGoals((prev) => [...prev, { text: '', checked: false }]);
  }, []);

  const removeGoal = useCallback(() => {
    setGoals((prev) => (prev.length > 0 ? prev.slice(0, -1) : prev));
  }, []);

  const updateGoal = useCallback((index: number, updates: Partial<DailyJournalGoal>) => {
    setGoals((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...updates } : g))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      await saveDailyJournal({
        userId: currentUser.uid,
        dateKey: editingDateKey,
        goals,
        detailContent,
        tomorrowPlan,
        memo,
      });
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const timeStr = `${h}시 ${m}분 ${s}초`;
      setSaveMessage({ type: 'success', text: `저장되었습니다. ${timeStr}` });
      refetch();
    } catch (e) {
      setSaveMessage({
        type: 'error',
        text: e instanceof Error ? e.message : '저장에 실패했습니다.',
      });
    } finally {
      setSaving(false);
    }
  }, [currentUser.uid, editingDateKey, goals, detailContent, tomorrowPlan, memo, refetch]);

  const openList = useCallback(() => {
    setViewMode('list');
  }, []);

  const openWrite = useCallback((dateKey?: string) => {
    setViewMode('write');
    setEditingDateKey(dateKey ?? todayKey);
    setSaveMessage(null);
  }, [todayKey]);

  if (viewMode === 'list') {
    return (
      <div className="h-full overflow-auto bg-brand-light">
        <div className="max-w-2xl mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-brand-dark flex items-center gap-2">
              <History className="text-brand-main" />
              내 기록 보기
            </h1>
            <button
              type="button"
              onClick={() => openWrite()}
              className="px-4 py-2 rounded-lg bg-brand-main text-white text-sm font-medium hover:opacity-90"
            >
              오늘 일지 쓰기
            </button>
          </div>
          {listLoading ? (
            <p className="flex items-center gap-2 text-gray-500">
              <Loader2 size={18} className="animate-spin" /> 목록 불러오는 중…
            </p>
          ) : listError ? (
            <p className="text-red-600 text-sm">{listError}</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500 text-sm">저장된 업무일지가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {items.map(({ id, dateKey }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openWrite(dateKey)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-brand-sub hover:bg-brand-sub/5 text-left transition-colors flex-shrink-0"
                >
                  <img
                    src={NOTEPAD_ICON}
                    alt=""
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                  <span className="font-medium text-brand-dark">
                    {formatDateKeySlash(dateKey)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (docLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-light">
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <Loader2 size={28} className="animate-spin text-brand-main" />
          <span className="text-sm">업무일지 불러오는 중…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-brand-light">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl font-bold text-brand-dark flex items-center gap-2">
            <FileText className="text-brand-main" />
            업무일지 작성
          </h1>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span
                className={`text-sm ${saveMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}
              >
                {saveMessage.text}
              </span>
            )}
            <button
              type="button"
              onClick={openList}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 bg-white text-brand-dark text-sm font-medium hover:bg-gray-50 min-h-[44px] md:min-h-0"
            >
              <History size={18} />
              내 기록 보기
            </button>
          </div>
        </div>

        <section className="mb-4 md:mb-6">
          <span className="text-xl md:text-2xl font-bold text-brand-dark">
            {formatDateKeyLong(editingDateKey)}
          </span>
          {!isEditingToday && (
            <p className="text-sm text-amber-600 mt-1">지난 날짜는 수정할 수 없습니다.</p>
          )}
        </section>

        {/* 좌: 목표·내일 계획·메모 / 우: 업무 상세(세로 길게) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-4 md:gap-6 mb-4 md:mb-6">
          {/* 좌측: 오늘의 주요목표, 내일의 계획, 기타 메모 및 아이디어 */}
          <div className="flex flex-col gap-4 md:gap-6 lg:min-h-0">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2">
                  <ListChecks size={18} className="text-brand-sub" />
                  오늘의 주요 목표
                </h2>
                {isEditingToday && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={removeGoal}
                      disabled={goals.length === 0}
                      className="p-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                      title="목표 삭제"
                    >
                      <Minus size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={addGoal}
                      className="p-2 rounded-lg border border-brand-sub bg-brand-sub/10 text-brand-main hover:bg-brand-sub/20 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                      title="목표 추가"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                )}
              </div>
              <ul className="space-y-2">
                {goals.map((goal, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={goal.checked}
                      onChange={(e) => updateGoal(i, { checked: e.target.checked })}
                      disabled={!isEditingToday}
                      className="w-5 h-5 rounded border-gray-300 text-brand-main focus:ring-brand-main disabled:opacity-60 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={goal.text}
                      onChange={(e) => updateGoal(i, { text: e.target.value })}
                      placeholder={i >= DEFAULT_GOAL_COUNT - 1 && !goal.text ? '새로운 목표를 입력하세요...' : ''}
                      disabled={!isEditingToday}
                      className={`flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg bg-white text-brand-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-sub disabled:bg-gray-50 disabled:cursor-not-allowed ${goal.checked ? 'line-through text-gray-500' : ''}`}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2">
                <Lightbulb size={18} className="text-brand-sub" />
                내일의 계획
              </h2>
              <textarea
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                placeholder="내일 해야 할 핵심 업무..."
                rows={4}
                disabled={!isEditingToday}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-brand-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-sub resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </section>

            <section>
              <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2">
                <Lightbulb size={18} className="text-brand-sub" />
                기타 메모 및 아이디어
              </h2>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="자유로운 아이디어 기록..."
                rows={4}
                disabled={!isEditingToday}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-brand-dark placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-sub resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </section>
          </div>

          {/* 우측: 업무 상세 내용 (좌측과 높이 대칭, 내용은 영역 내 스크롤) */}
          <section className="flex flex-col h-full min-h-[320px] lg:min-h-0 overflow-hidden">
            <h2 className="text-base font-semibold text-brand-dark flex items-center gap-2 mb-2 flex-shrink-0">
              <FileText size={18} className="text-brand-sub" />
              업무 상세 내용
            </h2>
            <div className="flex-1 min-h-0 overflow-hidden">
              <RichTextEditor
                key={journal ? `${editingDateKey}-${journal.updatedAt}` : editingDateKey}
                value={hasSyncedFromJournal ? detailContent : (journal?.detailContent ?? detailContent)}
                onChange={setDetailContent}
                readOnly={!isEditingToday}
                className="h-full flex flex-col overflow-hidden"
              />
            </div>
          </section>
        </div>

        {isEditingToday && (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-brand-main text-white font-medium hover:opacity-90 disabled:opacity-60 flex items-center gap-2 min-h-[44px] md:min-h-0"
            >
              {saving && <Loader2 size={18} className="animate-spin" />}
              저장
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
