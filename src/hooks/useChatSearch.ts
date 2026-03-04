import { useState, useCallback, useMemo, useEffect } from 'react';
import type { ChatMessage } from '../types/chat';

function matchesQuery(msg: ChatMessage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const textMatch = msg.text?.toLowerCase().includes(q) ?? false;
  const fileNameMatch = msg.fileName?.toLowerCase().includes(q) ?? false;
  return textMatch || fileNameMatch;
}

export interface UseChatSearchResult {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  matchedIds: string[];
  currentIndex: number;
  goPrev: () => void;
  goNext: () => void;
  isMatched: (msgId: string) => boolean;
}

export function useChatSearch(messages: ChatMessage[]): UseChatSearchResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const matchedIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return messages
      .filter((msg) => matchesQuery(msg, searchQuery))
      .map((msg) => msg.id);
  }, [messages, searchQuery]);

  useEffect(() => {
    setCurrentIndex((prev) => Math.min(prev, Math.max(0, matchedIds.length - 1)));
  }, [matchedIds]);

  const goPrev = useCallback(() => {
    if (matchedIds.length === 0) return;
    setCurrentIndex((prev) => (prev <= 0 ? matchedIds.length - 1 : prev - 1));
  }, [matchedIds.length]);

  const goNext = useCallback(() => {
    if (matchedIds.length === 0) return;
    setCurrentIndex((prev) => (prev >= matchedIds.length - 1 ? 0 : prev + 1));
  }, [matchedIds.length]);

  const isMatched = useCallback(
    (msgId: string) => matchedIds.includes(msgId),
    [matchedIds]
  );

  return {
    searchQuery,
    setSearchQuery,
    matchedIds,
    currentIndex,
    goPrev,
    goNext,
    isMatched,
  };
}
