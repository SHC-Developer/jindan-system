import { useState, useEffect } from 'react';
import { Loader2, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';

const CHECK_IP_URL = import.meta.env.VITE_CHECK_IP_URL as string | undefined;
const OFFICE_IP = '211.170.156.173';

interface IpCheckResult {
  ip: string;
  allowed: boolean;
}

export function IpTestPage() {
  const [result, setResult] = useState<IpCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkIp = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!CHECK_IP_URL) {
        throw new Error('VITE_CHECK_IP_URL 환경변수가 설정되지 않았습니다.');
      }
      const res = await fetch(CHECK_IP_URL);
      if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
      const data = (await res.json()) as IpCheckResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'IP 확인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkIp();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-brand-dark px-4 py-4 md:px-6 md:py-5">
          <h1 className="text-base md:text-lg font-bold text-white text-center">
            사무실 IP 체크 테스트
          </h1>
          <p className="text-xs md:text-sm text-gray-400 text-center mt-1">
            출퇴근 기능 IP 제한 검증용
          </p>
        </div>

        <div className="p-4 md:p-6 space-y-4 md:space-y-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-6 md:py-8">
              <Loader2 size={32} className="animate-spin text-brand-main" />
              <span className="text-sm text-gray-500">IP 주소 확인 중…</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 text-center">
              <ShieldX size={28} className="mx-auto text-red-500 mb-2" />
              <p className="text-sm font-medium text-red-700">오류 발생</p>
              <p className="text-xs text-red-500 mt-1">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-3 md:space-y-4">
              <div className={`rounded-xl p-4 md:p-5 text-center border ${
                result.allowed
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {result.allowed ? (
                  <ShieldCheck size={36} className="mx-auto text-green-500 mb-2" />
                ) : (
                  <ShieldX size={36} className="mx-auto text-red-500 mb-2" />
                )}
                <p className={`text-base md:text-lg font-bold ${
                  result.allowed ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.allowed ? '사무실 네트워크 확인됨' : '사무실 네트워크 아님'}
                </p>
                <p className={`text-xs md:text-sm mt-1 ${
                  result.allowed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {result.allowed
                    ? '이 네트워크에서 출퇴근 기록이 가능합니다.'
                    : '이 네트워크에서는 출퇴근 기록이 차단됩니다.'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 md:p-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">감지된 IP</span>
                  <span className="font-mono font-medium text-gray-900">{result.ip}</span>
                </div>
                <div className="border-t border-gray-200" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">사무실 IP</span>
                  <span className="font-mono font-medium text-gray-900">{OFFICE_IP}</span>
                </div>
                <div className="border-t border-gray-200" />
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">일치 여부</span>
                  <span className={`font-medium ${result.allowed ? 'text-green-600' : 'text-red-600'}`}>
                    {result.allowed ? '일치' : '불일치'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={checkIp}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white font-medium text-sm py-2.5 md:py-3 rounded-xl transition-colors min-h-[44px]"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            다시 확인
          </button>
        </div>

        <div className="px-4 pb-4 md:px-6 md:pb-5">
          <p className="text-xs text-gray-400 text-center">
            이 페이지는 IP 제한 기능 테스트 전용입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
