import { X } from 'lucide-react';

interface ImageLightboxProps {
  imageUrl: string;
  onClose: () => void;
  alt?: string;
}

/** 이미지 확대 모달 (채팅 첨부·pending 미리보기 공통) */
export function ImageLightbox({ imageUrl, onClose, alt = '이미지' }: ImageLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white z-10"
        aria-label="닫기"
      >
        <X size={24} />
      </button>
      <img
        src={imageUrl}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        loading="lazy"
      />
    </div>
  );
}
