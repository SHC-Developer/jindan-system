import { X, User } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
  alt?: string;
  /** 지정 시 이미지를 이 크기 박스 안에 담아 표시 (예: 프로필 원본 375x375) */
  fixedSize?: { width: number; height: number };
}

/** 이미지 확대 모달 (채팅 첨부·pending 미리보기·프로필 원본 공통) */
export function ImageLightbox({ imageUrl, onClose, alt = '이미지', fixedSize }: ImageLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="닫기"
      >
        <X size={24} />
      </button>
      <div
        className={`flex items-center justify-center rounded-lg shadow-2xl bg-white overflow-hidden max-w-[90vw] max-h-[85vh] ${fixedSize ? 'w-[90vw] h-[85vh] md:w-[375px] md:h-[375px]' : 'w-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={alt}
          className={fixedSize ? 'w-full h-full object-contain' : 'max-w-full max-h-[85vh] object-contain rounded-lg'}
          loading="lazy"
        />
      </div>
    </div>
  );
}

interface ProfileNoPhotoModalProps {
  onClose: () => void;
  size?: number;
}

/** 프로필 사진이 없을 때 클릭 시 표시하는 모달 (반응형: 모바일 90vw, 데스크톱 size) */
export function ProfileNoPhotoModal({ onClose, size = 375 }: ProfileNoPhotoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="프로필 사진 없음"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white z-10 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="닫기"
      >
        <X size={24} />
      </button>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg shadow-2xl bg-white text-gray-500 w-[90vw] max-w-[375px] min-h-[200px] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <User size={80} className="text-gray-300" />
        <p className="text-sm">프로필 사진이 없습니다</p>
      </div>
    </div>
  );
}
