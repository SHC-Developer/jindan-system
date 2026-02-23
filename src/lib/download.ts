/**
 * URL에서 파일을 blob으로 받아 로컬에 다운로드되도록 트리거합니다.
 * 외부 URL(Firebase Storage 등)은 <a download>만으로는 새 탭에서 열리므로
 * fetch → blob → object URL → 프로그래매틱 클릭으로 처리합니다.
 */
export async function downloadFileFromUrl(url: string, fileName: string): Promise<void> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`다운로드 실패: ${res.status}`);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName || 'download';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
