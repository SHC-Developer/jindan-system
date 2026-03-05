import { User } from 'lucide-react';

interface ChatMessageAvatarProps {
  photoURL: string | null;
  displayName?: string | null;
  className?: string;
}

/** 채팅 메시지 발신자 아바타: 프로필 사진이 있으면 원형 이미지, 없으면 사람 아이콘 */
export function ChatMessageAvatar({ photoURL, displayName, className = '' }: ChatMessageAvatarProps) {
  const baseClass = 'w-9 h-9 rounded-full mr-3 mt-1 flex-shrink-0 flex items-center justify-center overflow-hidden bg-brand-sub/20 text-brand-dark';
  const combinedClass = `${baseClass} ${className}`.trim();

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName ? `${displayName} 프로필` : '프로필'}
        className={`${combinedClass} object-cover`}
      />
    );
  }

  return (
    <div className={combinedClass} aria-hidden>
      <User size={18} />
    </div>
  );
}
