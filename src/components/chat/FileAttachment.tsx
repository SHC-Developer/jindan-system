import { Download } from 'lucide-react';
import { downloadFileFromUrl } from '../../lib/download';
import { formatFileSize, isImageFile } from '../../lib/storage';
import type { ChatMessage } from '../../types/chat';

async function handleDownload(
  e: React.MouseEvent,
  url: string,
  fileName: string | null
) {
  e.preventDefault();
  e.stopPropagation();
  const name = fileName ?? new URL(url).pathname.split('/').pop() ?? 'download';
  try {
    await downloadFileFromUrl(url, decodeURIComponent(name));
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

interface FileAttachmentProps {
  msg: ChatMessage;
  isMe: boolean;
  onImageClick?: (url: string) => void;
}

/** 파일 첨부가 있는 메시지의 표시 영역 */
export function FileAttachment({ msg, isMe, onImageClick }: FileAttachmentProps) {
  if (!msg.fileUrl) return null;
  const image = msg.fileType ? isImageFile(msg.fileType) : false;

  if (image) {
    return (
      <div className="mt-1.5 relative group">
        <div
          role={onImageClick ? 'button' : undefined}
          tabIndex={onImageClick ? 0 : undefined}
          onClick={onImageClick ? () => onImageClick(msg.fileUrl!) : undefined}
          onKeyDown={
            onImageClick ? (e) => e.key === 'Enter' && onImageClick(msg.fileUrl!) : undefined
          }
          className={onImageClick ? 'cursor-zoom-in' : ''}
        >
          <img
            src={msg.fileUrl}
            alt={msg.fileName ?? '이미지'}
            className="max-w-full max-h-64 rounded-lg object-cover"
            loading="lazy"
          />
        </div>
        <a
          href={msg.fileUrl}
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(e, msg.fileUrl!, msg.fileName);
          }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          title="다운로드"
        >
          <Download size={14} />
        </a>
      </div>
    );
  }

  return (
    <a
      href={msg.fileUrl}
      onClick={(e) => handleDownload(e, msg.fileUrl!, msg.fileName)}
      className={`mt-1.5 flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
        isMe
          ? 'border-white/20 hover:bg-white/10'
          : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div
        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
          isMe ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {(msg.fileName ?? '').split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE'}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-gray-700'}`}>
          {msg.fileName}
        </div>
        {msg.fileSize != null && (
          <div className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
            {formatFileSize(msg.fileSize)}
          </div>
        )}
      </div>
      <Download size={14} className={`flex-shrink-0 ${isMe ? 'text-white/70' : 'text-gray-400'}`} />
    </a>
  );
}
