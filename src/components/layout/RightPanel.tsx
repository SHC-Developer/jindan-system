import { MoreHorizontal, CheckSquare, FileText, X } from 'lucide-react';

interface RightPanelProps {
  selectedMenuData: { name: string };
  /** 모바일에서 패널 열림 여부 (미전달 시 데스크톱처럼 항상 표시) */
  isOpen?: boolean;
  /** 모바일에서 패널 닫기 콜백 */
  onClose?: () => void;
}

function RightPanelContent({ selectedMenuData, onClose }: RightPanelProps) {
  return (
    <>
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-brand-light flex-shrink-0">
        <span className="font-semibold text-gray-700">정보 패널</span>
        <div className="flex items-center gap-1">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 md:hidden"
              aria-label="패널 닫기"
            >
              <X size={18} />
            </button>
          )}
          <button type="button" className="text-gray-400 hover:text-gray-600 p-2" aria-hidden>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-gray-800 flex items-center">
              <CheckSquare size={14} className="mr-2 text-brand-sub" />
              진행 체크리스트
            </h4>
            <span className="text-xs font-medium text-brand-main bg-brand-main/10 px-2 py-0.5 rounded-full">
              2/5 완료
            </span>
          </div>
          <div className="space-y-2">
            {[
              { text: '현장조사 준비', done: true },
              { text: '데이터 1차 검수', done: true },
              { text: '균열 측정값 입력', done: false },
              { text: '사진 매핑 확인', done: false },
              { text: '최종 승인 요청', done: false },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start group cursor-pointer">
                <div
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${
                    item.done
                      ? 'bg-brand-sub border-brand-sub text-white'
                      : 'border-gray-300 bg-white group-hover:border-brand-sub'
                  }`}
                >
                  {item.done && <CheckSquare size={10} />}
                </div>
                <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h4 className="font-semibold text-sm text-gray-800 mb-3 flex items-center">
            <FileText size={14} className="mr-2 text-brand-sub" />
            최근 파일
          </h4>
          <div className="space-y-3">
            {[
              { name: '교량A_현장조사_v2.pdf', size: '2.4 MB', type: 'PDF' },
              { name: '균열_데이터_20231024.xlsx', size: '850 KB', type: 'XLSX' },
              { name: '현장사진_모음.zip', size: '154 MB', type: 'ZIP' },
            ].map((file, idx) => (
              <div
                key={idx}
                className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-gray-500 mr-3 group-hover:bg-white group-hover:shadow-sm">
                  {file.type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 truncate">{file.name}</div>
                  <div className="text-xs text-gray-400">{file.size}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-2 text-xs text-gray-500 hover:text-brand-main py-1 text-center">
            모두 보기
          </button>
        </div>

        <div className="bg-brand-main/5 rounded-xl border border-brand-main/10 p-4">
          <h4 className="font-semibold text-sm text-brand-main mb-2">
            {selectedMenuData.name} 가이드
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            이 단계에서는 현장에서 수집된 데이터를 기반으로 자동화된 분석을 수행합니다.
            오른쪽 상단의 &apos;자동화 작업&apos; 탭에서 데이터를 입력해주세요.
          </p>
        </div>
      </div>
    </>
  );
}

/** 우측 패널 (프로젝트 채팅/공지사항 채팅 공통) - selectedMenuData.name으로 가이드 제목 사용 */
export function RightPanel({ selectedMenuData, isOpen = false, onClose }: RightPanelProps) {
  const content = <RightPanelContent selectedMenuData={selectedMenuData} onClose={onClose} />;

  return (
    <>
      {/* 데스크톱/태블릿: 사이드바 */}
      <div className="hidden md:flex w-80 lg:w-80 bg-brand-light border-l border-gray-200 flex-col h-full flex-shrink-0">
        {content}
      </div>
      {/* 모바일: 오버레이 (열림 시에만 표시) */}
      {onClose && (
        <div
          className={`md:hidden fixed inset-0 z-40 flex flex-col bg-brand-light transition-opacity ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          style={{ visibility: isOpen ? 'visible' : 'hidden' }}
        >
          {isOpen && (
            <>
              <div className="absolute inset-0 bg-black/30 z-0" onClick={onClose} aria-hidden />
              <div className="relative z-10 flex flex-col h-full w-full max-w-sm ml-auto bg-brand-light shadow-xl">
                {content}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
