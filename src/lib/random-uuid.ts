/**
 * 반복 일정 시리즈 ID 등. HTTPS 외·구형 WebView·일부 Electron 컨텍스트에서는
 * `crypto.randomUUID`가 없을 수 있어 getRandomValues·최후 수단 폴백을 둔다.
 */
export function randomUuidV4(): string {
  const c = globalThis.crypto;
  if (c != null && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c != null && typeof c.getRandomValues === 'function') {
    const buf = new Uint8Array(16);
    c.getRandomValues(buf);
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
