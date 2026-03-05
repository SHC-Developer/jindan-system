import { useRef, useEffect, useCallback, useState } from 'react';

const BOTTOM_THRESHOLD = 120;

/**
 * 채팅 메시지 영역의 자동 스크롤을 제어하는 훅.
 * - 사용자가 맨 아래에 있을 때만 새 메시지 시 자동 스크롤
 * - 위쪽을 읽고 있으면 "새 메시지" 배지만 표시
 */
export function useAutoScroll(messagesLength: number) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevLengthRef = useRef(messagesLength);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  const checkNearBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    if (isNearBottomRef.current) {
      setHasNewBelow(false);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkNearBottom, { passive: true });
    return () => el.removeEventListener('scroll', checkNearBottom);
  }, [checkNearBottom]);

  useEffect(() => {
    if (messagesLength <= prevLengthRef.current) {
      prevLengthRef.current = messagesLength;
      return;
    }
    prevLengthRef.current = messagesLength;

    if (isNearBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setHasNewBelow(true);
    }
  }, [messagesLength]);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setHasNewBelow(false);
  }, []);

  return { containerRef, endRef, hasNewBelow, scrollToBottom };
}
