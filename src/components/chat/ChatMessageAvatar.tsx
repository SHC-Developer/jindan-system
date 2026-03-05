import { User } from 'lucide-react';

interface ChatMessageAvatarProps {
  photoURL: string | null;
  displayName?: string | null;
  className?: string;
  /** 프로필 이미지 클릭 시 호출. photoURL이 있으면 이미지, 없으면 null 전달 (기본 아이콘 클릭) */
  onAvatarClick?: (photoURL: string | null) => void;
}

/** 채팅 메시지 발신자 아바타: 프로필 사진이 있으면 원형 이미지, 없으면 사람 아이콘. 클릭 시 원본 보기 가능 */
export function ChatMessageAvatar({ photoURL, displayName, className = '', onAvatarClick }: ChatMessageAvatarProps) {
  const baseClass = 'w-12 h-12 rounded-full mr-3 mt-1 flex-shrink-0 flex items-center justify-center overflow-hidden bg-white text-[#37392E]';
  const combinedClass = `${baseClass} ${className}`.trim();

  if (photoURL) {
    if (onAvatarClick) {
      return (
        <button
          type="button"
          onClick={() => onAvatarClick(photoURL)}
          className="w-12 h-12 rounded-full mr-3 mt-1 flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#28AFB0] focus:ring-offset-1 p-0 border-0 cursor-pointer bg-white"
          aria-label={displayName ? `${displayName} 프로필 보기` : '프로필 보기'}
        >
          <img
            src={photoURL}
            alt={displayName ? `${displayName} 프로필` : '프로필'}
            className="w-full h-full object-cover"
          />
        </button>
      );
    }
    return (
      <img
        src={photoURL}
        alt={displayName ? `${displayName} 프로필` : '프로필'}
        className={`${combinedClass} object-cover`}
      />
    );
  }

  if (onAvatarClick) {
    return (
      <button
        type="button"
        onClick={() => onAvatarClick(null)}
        className="w-12 h-12 rounded-full mr-3 mt-1 flex-shrink-0 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#28AFB0] focus:ring-offset-1 p-0 border-0 cursor-pointer bg-white flex items-center justify-center text-[#37392E]"
        aria-label={displayName ? `${displayName} 프로필 보기` : '프로필 보기'}
      >
        <User size={20} />
      </button>
    );
  }

  return (
    <div className={combinedClass} aria-hidden>
      <User size={20} />
    </div>
  );
}
