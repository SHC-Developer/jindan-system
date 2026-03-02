import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Paperclip,
  Send,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Pin,
  PinOff,
  X,
} from 'lucide-react';
import { useChat } from '../../hooks/useChat';
import { usePinnedNotices } from '../../hooks/usePinnedNotices';
import { formatChatDateLabel, formatChatTime } from '../../lib/chat-format';
import { formatFileSize } from '../../lib/storage';
import { validateChatFile, createPendingFile } from '../../lib/chat-file';
import { GENERAL_CHAT_PROJECT_ID, GENERAL_CHAT_SUBMENU_ID } from '../../constants/navigation';
import { Sidebar } from '../../components/layout/Sidebar';
import { RightPanel } from '../../components/layout/RightPanel';
import { ImageLightbox } from '../../components/chat/ImageLightbox';
import { FileAttachment } from '../../components/chat/FileAttachment';
import type { AppUser } from '../../types/user';
import type { ChatMessage } from '../../types/chat';
import type { SidebarProps } from '../../types/layout';
import type { PendingChatFile } from '../../types/chat';

interface GeneralChatPageProps {
  user: AppUser;
  sidebarProps: SidebarProps;
  onLogout: () => void;
}

/** 공지사항/일반채팅 전용 전체 레이아웃: 상단 다크 헤더 + 밝은 채팅 영역 + 우측 패널 */
export function GeneralChatPage({ user, sidebarProps, onLogout }: GeneralChatPageProps) {
  const {
    messages,
    sendMessage,
    sendFileMessage,
    deleteMessage,
    canDeleteMessage,
    loading,
    error,
    clearError,
  } = useChat({
    projectId: GENERAL_CHAT_PROJECT_ID,
    subMenuId: GENERAL_CHAT_SUBMENU_ID,
    currentUser: user,
  });

  const { pinnedMessageIds, addPinned, removePinned } = usePinnedNotices({
    projectId: GENERAL_CHAT_PROJECT_ID,
    subMenuId: GENERAL_CHAT_SUBMENU_ID,
  });

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingChatFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const pendingFilesRef = useRef<PendingChatFile[]>([]);
  useEffect(() => {
    pendingFilesRef.current = pendingFiles;
  }, [pendingFiles]);
  useEffect(() => {
    return () => {
      pendingFilesRef.current.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const pinnedMessages = React.useMemo(
    () => messages.filter((m) => pinnedMessageIds.includes(m.id)),
    [messages, pinnedMessageIds]
  );

  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, ChatMessage[]>();
    for (const msg of messages) {
      const key = formatChatDateLabel(msg.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(msg);
    }
    return Array.from(map.entries());
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', close);
      window.addEventListener('scroll', close, true);
      return () => {
        window.removeEventListener('click', close);
        window.removeEventListener('scroll', close, true);
      };
    }
  }, [contextMenu]);

  const addFileToPending = useCallback((file: File) => {
    const result = validateChatFile(file);
    if (result.ok === false) {
      setToastMessage(result.message);
      return;
    }
    setPendingFiles((prev) => [...prev, createPendingFile(file)]);
    clearError();
  }, []);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      const removed = prev.find((p) => p.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (pendingFiles.length > 0) {
      clearError();
      setUploadProgress(0);
      try {
        for (let i = 0; i < pendingFiles.length; i++) {
          await sendFileMessage(
            pendingFiles[i].file,
            i === 0 ? text : '',
            (percent) => setUploadProgress(percent)
          );
        }
        setInputText('');
        pendingFiles.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
        setPendingFiles([]);
      } catch {
        // error already set in hook
      } finally {
        setUploadProgress(null);
      }
      return;
    }
    if (!text) return;
    setInputText('');
    await sendMessage(text);
  }, [inputText, pendingFiles, sendMessage, sendFileMessage, clearError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) addFileToPending(file);
      e.target.value = '';
    },
    [addFileToPending]
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.types.includes('Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      const files = e.dataTransfer.files;
      if (files?.length) {
        Array.from(files).forEach((file) => addFileToPending(file));
      }
    },
    [addFileToPending]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addFileToPending(file);
          return;
        }
      }
    },
    [addFileToPending]
  );

  const handleDeleteMessage = useCallback(
    async (msg: ChatMessage) => {
      if (!canDeleteMessage(msg, user)) return;
      if (!window.confirm('이 메시지를 삭제할까요?')) return;
      setDeletingMessageId(msg.id);
      clearError();
      try {
        await deleteMessage(msg.id, msg);
      } catch {
        // error already set in hook
      } finally {
        setDeletingMessageId(null);
      }
    },
    [canDeleteMessage, user, deleteMessage, clearError]
  );

  const uploading = uploadProgress !== null;
  const canSend = (inputText.trim().length > 0 || pendingFiles.length > 0) && !uploading;

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-brand-light">
      <Sidebar {...sidebarProps} />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div
            className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-light relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />

            <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
              <div className="flex items-center min-w-0">
                <span className="font-medium text-brand-main text-sm">공지사항/일반채팅</span>
              </div>
              <div className="flex items-center min-w-0 flex-1 justify-end ml-4">
                <div className="relative hidden md:block w-full max-w-md">
                  <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="검색"
                    className="pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-md text-sm focus:ring-2 focus:ring-brand-sub/50 outline-none w-full transition-all"
                  />
                </div>
              </div>
            </header>

            {isDragging && (
              <div className="absolute inset-0 z-30 bg-brand-sub/10 border-2 border-dashed border-brand-sub rounded-lg flex items-center justify-center pointer-events-none">
                <div className="bg-white px-6 py-4 rounded-xl shadow-lg text-center">
                  <Paperclip size={32} className="mx-auto mb-2 text-brand-sub" />
                  <p className="text-sm font-medium text-gray-700">파일을 여기에 놓으세요</p>
                  <p className="text-xs text-gray-400 mt-1">최대 100MB</p>
                </div>
              </div>
            )}

            {uploading && (
              <div className="px-6 pt-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-brand-sub/10 rounded-lg px-3 py-2">
                  <Loader2 size={16} className="text-brand-sub animate-spin" />
                  <div className="flex-1">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-sub rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium w-10 text-right">{uploadProgress}%</span>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {error && <div className="text-center text-sm text-red-600 py-2">{error}</div>}
              {loading ? (
                <div className="flex justify-center py-8 text-gray-500 text-sm">메시지 불러오는 중…</div>
              ) : (
                <>
                  {pinnedMessages.length > 0 && (
                    <div className="mb-6 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-xs font-semibold text-brand-main mb-2">
                        <Pin size={14} />
                        공지
                      </div>
                      <div className="space-y-2">
                        {pinnedMessages.map((msg) => {
                          const isMe = msg.senderId === user.uid;
                          const displayName = [msg.senderDisplayName, msg.senderJobTitle].filter(Boolean).join(' ');
                          const timeStr = formatChatTime(msg.createdAt);
                          const showDelete = canDeleteMessage(msg, user);
                          const isDeleting = deletingMessageId === msg.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, msg });
                              }}
                            >
                              {!isMe && (
                                <div className="w-9 h-9 rounded-full mr-3 mt-1 bg-brand-sub/20 flex items-center justify-center text-brand-dark text-sm font-semibold flex-shrink-0">
                                  {(msg.senderDisplayName?.[0] ?? '?')}
                                </div>
                              )}
                              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                {!isMe && (
                                  <div className="flex items-baseline mb-1">
                                    <span className="font-semibold text-sm text-gray-900 mr-2">{displayName}</span>
                                    <span className="text-xs text-gray-400">{timeStr}</span>
                                  </div>
                                )}
                                <div className="flex items-end gap-1">
                                  <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm bg-amber-50 border border-amber-200 ${
                                      isMe ? 'rounded-tr-none' : 'rounded-tl-none'
                                    }`}
                                  >
                                    {msg.text && <p className="text-gray-800">{msg.text}</p>}
                                    <FileAttachment msg={msg} isMe={isMe} onImageClick={(url) => setExpandedImageUrl(url)} />
                                  </div>
                                  {showDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg)}
                                      disabled={isDeleting}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                                      title="메시지 삭제"
                                      aria-label="메시지 삭제"
                                    >
                                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                  )}
                                </div>
                                {isMe && <span className="text-xs text-gray-400 mt-1 mr-1">{timeStr}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {groupedByDate.length === 0 && pinnedMessages.length === 0 ? (
                    <div className="flex justify-center py-8 text-gray-500 text-sm">아직 메시지가 없습니다. 첫 메시지를 보내보세요.</div>
                  ) : (
                    groupedByDate.map(([dateLabel, msgs]) => (
                      <div key={dateLabel} className="space-y-4">
                        <div className="flex justify-center my-4">
                          <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">{dateLabel}</span>
                        </div>
                        {msgs.map((msg) => {
                          const isMe = msg.senderId === user.uid;
                          const displayName = [msg.senderDisplayName, msg.senderJobTitle].filter(Boolean).join(' ');
                          const timeStr = formatChatTime(msg.createdAt);
                          const showDelete = canDeleteMessage(msg, user);
                          const isDeleting = deletingMessageId === msg.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, msg });
                              }}
                            >
                              {!isMe && (
                                <div className="w-9 h-9 rounded-full mr-3 mt-1 bg-brand-sub/20 flex items-center justify-center text-brand-dark text-sm font-semibold flex-shrink-0">
                                  {(msg.senderDisplayName?.[0] ?? '?')}
                                </div>
                              )}
                              <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                {!isMe && (
                                  <div className="flex items-baseline mb-1">
                                    <span className="font-semibold text-sm text-gray-900 mr-2">{displayName}</span>
                                    <span className="text-xs text-gray-400">{timeStr}</span>
                                  </div>
                                )}
                                <div className="flex items-end gap-1">
                                  <div
                                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                      isMe
                                        ? 'bg-brand-main text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                    }`}
                                  >
                                    {msg.text && <p>{msg.text}</p>}
                                    <FileAttachment msg={msg} isMe={isMe} onImageClick={(url) => setExpandedImageUrl(url)} />
                                  </div>
                                  {showDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMessage(msg)}
                                      disabled={isDeleting}
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                                      title="메시지 삭제"
                                      aria-label="메시지 삭제"
                                    >
                                      {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    </button>
                                  )}
                                </div>
                                {isMe && <span className="text-xs text-gray-400 mt-1 mr-1">{timeStr}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {expandedImageUrl && (
              <ImageLightbox
                imageUrl={expandedImageUrl}
                onClose={() => setExpandedImageUrl(null)}
                alt="첨부 이미지"
              />
            )}

            <div className="p-4 bg-brand-light border-t border-gray-200 flex-shrink-0">
              {toastMessage && (
                <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg">
                  {toastMessage}
                </div>
              )}
              <p className="text-xs text-gray-500 mb-1.5">
                파일을 끌어다 놓거나 Ctrl+V로 붙여넣을 수 있습니다 (최대 100MB)
              </p>
              <div
                className="bg-white border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-sub/30 focus-within:border-brand-sub transition-all shadow-sm"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  dragCounter.current = 0;
                  const files = e.dataTransfer.files;
                  if (files?.length) {
                    Array.from(files).forEach((file) => addFileToPending(file));
                  }
                }}
              >
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-1">
                    {pendingFiles.map((p) => (
                      <div
                        key={p.id}
                        className="relative inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden shadow-sm"
                      >
                        {p.previewUrl ? (
                          <button
                            type="button"
                            onClick={() => setExpandedImageUrl(p.previewUrl!)}
                            className="w-14 h-14 flex-shrink-0 cursor-zoom-in p-0 border-0 bg-transparent block"
                          >
                            <img src={p.previewUrl} alt={p.file.name} className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-14 h-14 bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <FileText size={20} className="text-gray-500" />
                          </div>
                        )}
                        <div className="py-1 pr-8 pl-0.5 min-w-0 max-w-[140px]">
                          <p className="text-xs font-medium text-gray-700 truncate">{p.file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(p.file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(p.id)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                          title="제거"
                          aria-label="첨부 제거"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  placeholder="메시지를 입력하세요"
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[40px] max-h-[120px] px-2 py-1 text-gray-900"
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  disabled={uploading}
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 text-gray-400 hover:text-brand-sub hover:bg-gray-200 rounded-md transition-colors disabled:opacity-40"
                      title="파일 첨부 (최대 100MB)"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 text-gray-400 hover:text-brand-sub hover:bg-gray-200 rounded-md transition-colors disabled:opacity-40"
                      title="이미지 첨부"
                    >
                      <ImageIcon size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={!canSend}
                    className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white p-2 rounded-lg shadow-sm flex items-center justify-center"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <RightPanel selectedMenuData={{ name: '공지사항/일반채팅' }} />
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] py-1 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {pinnedMessageIds.includes(contextMenu.msg.id) ? (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                removePinned(contextMenu.msg.id);
                setContextMenu(null);
              }}
            >
              <PinOff size={14} />
              공지 해제
            </button>
          ) : (
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              onClick={() => {
                addPinned(contextMenu.msg.id);
                setContextMenu(null);
              }}
            >
              <Pin size={14} />
              공지로 등록하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
