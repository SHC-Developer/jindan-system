import React from 'react';

/**
 * 텍스트 내 검색어를 하이라이트한 React 노드 반환.
 * query가 비어 있으면 원문 그대로 반환.
 */
export function highlightText(text: string, query: string): React.ReactNode {
  if (!text) return null;
  if (!query.trim()) return text;

  const q = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <mark className="bg-amber-200 rounded px-0.5">{match}</mark>
      {highlightText(after, query)}
    </>
  );
}
