import React from 'react';
import { Search, ChevronUp, ChevronDown } from 'lucide-react';

interface ChatSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  matchedCount: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export function ChatSearchBar({
  value,
  onChange,
  matchedCount,
  currentIndex,
  onPrev,
  onNext,
}: ChatSearchBarProps) {
  const hasMatches = matchedCount > 0;
  const showNav = value.trim() && hasMatches;

  return (
    <div className="flex items-center gap-2 w-full max-w-md min-w-0">
      <div className="relative flex-1 min-w-0">
        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="검색"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-md text-sm focus:ring-2 focus:ring-brand-sub/50 outline-none w-full transition-all"
          aria-label="채팅 검색"
        />
      </div>
      {showNav && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {currentIndex + 1}/{matchedCount}개
          </span>
          <button
            type="button"
            onClick={onPrev}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="이전"
            aria-label="이전 검색 결과"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="다음"
            aria-label="다음 검색 결과"
          >
            <ChevronDown size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
