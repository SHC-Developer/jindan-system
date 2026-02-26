import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { useToastContext } from './contexts/ToastContext';
import { useNotifications } from './hooks/useNotifications';
import { NotificationToastContainer } from './components/NotificationToast';
import { WorkAssignAdminView } from './features/work-assign/WorkAssignAdminView';
import { WorkAssignMyListView } from './features/work-assign/WorkAssignMyListView';
import { TaskDetailPage } from './features/work-assign/TaskDetailPage';
import { formatChatDateLabel, formatChatTime } from './lib/chat-format';
import { downloadFileFromUrl } from './lib/download';
import { formatFileSize, isImageFile } from './lib/storage';
import type { AppUser } from './types/user';
import type { ChatMessage } from './types/chat';
import {
  Hash,
  Search,
  Bell,
  Filter,
  Paperclip,
  Send,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  FileText,
  CheckSquare,
  Image as ImageIcon,
  BarChart3,
  Settings,
  Menu,
  X,
  Star,
  LogOut,
  Download,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Mock Data ---

type MiddleMenuId =
  | 'quantity-extract'
  | 'photo-album'
  | 'report-review'
  | 'field-survey'
  | 'material-test';

interface MiddleMenu {
  id: MiddleMenuId;
  name: string;
  icon: React.ElementType;
}

interface Project {
  id: string;
  name: string;
}

const PROJECTS: Project[] = [
  { id: 'gyeonggi-bridge-A', name: '경기도 교량A' },
  { id: 'gyeonggi-bridge-B', name: '경기도 교량B' },
  { id: 'seoul-tunnel-C', name: '서울시 터널C' },
];

const MIDDLE_MENUS: MiddleMenu[] = [
  { id: 'quantity-extract', name: '물량표 추출', icon: BarChart3 },
  { id: 'photo-album', name: '사진첩 자동', icon: ImageIcon },
  { id: 'report-review', name: '보고서 작성 도구 및 검토', icon: FileText },
  { id: 'field-survey', name: '현장조사 자료 데이터 정리', icon: CheckSquare },
  { id: 'material-test', name: '재료시험 작성 도구', icon: Settings },
];

// --- Components ---

type ActiveSection = 'project' | 'work-assign';

interface SidebarProps {
  selectedProject: Project;
  setSelectedProject: (p: Project) => void;
  selectedMenu: MiddleMenuId;
  setSelectedMenu: (m: MiddleMenuId) => void;
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  user: { displayName: string | null; jobTitle: string | null; role: 'admin' | 'general' };
  onLogout: () => void;
}

const Sidebar = ({
  selectedProject,
  setSelectedProject,
  selectedMenu,
  setSelectedMenu,
  activeSection,
  setActiveSection,
  user,
  onLogout,
}: SidebarProps) => {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  return (
    <div className="w-64 bg-brand-dark text-gray-300 flex flex-col h-full flex-shrink-0">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 border-b border-gray-700/50 min-w-0" lang="ko">
        <div className="w-6 h-6 bg-brand-sub rounded-md mr-2 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
          A
        </div>
        <span className="font-bold text-white tracking-tight whitespace-nowrap flex-shrink-0" title="진단 자동화 플랫폼">
          진단 자동화 플랫폼
        </span>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* Projects Section */}
        <div className="px-2 mb-2">
          <button
            onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider mb-1"
          >
            <span>프로젝트</span>
            {isProjectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          <AnimatePresence>
            {isProjectsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-0.5"
              >
                {PROJECTS.map((project) => (
                  <div key={project.id}>
                    <button
                      onClick={() => {
                        setActiveSection('project');
                        setSelectedProject(project);
                      }}
                      className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
                        selectedProject.id === project.id && activeSection === 'project'
                          ? 'bg-white/10 text-white font-medium'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      <Hash size={16} className="mr-2 opacity-70" />
                      <span className="truncate">{project.name}</span>
                    </button>

                    {/* Middle Menus (Only shown for selected project) */}
                    {selectedProject.id === project.id && activeSection === 'project' && (
                      <div className="ml-4 mt-1 mb-3 space-y-0.5 border-l border-gray-700 pl-2">
                        {MIDDLE_MENUS.map((menu) => (
                          <button
                            key={menu.id}
                            onClick={() => setSelectedMenu(menu.id)}
                            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
                              selectedMenu === menu.id
                                ? 'bg-brand-main text-white shadow-sm'
                                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                            }`}
                          >
                            <menu.icon size={14} className="mr-2 opacity-80" />
                            <span className="truncate">{menu.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 업무 지시 (프로젝트와 별도 블록) */}
        <div className="px-2 mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={() => setActiveSection('work-assign')}
            className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
              activeSection === 'work-assign'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <CheckSquare size={16} className="mr-2 opacity-80" />
            <span className="truncate">업무 지시</span>
          </button>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 bg-black/20 flex items-center">
        <img 
          src="https://picsum.photos/seed/me/32/32" 
          alt="My Profile" 
          className="w-8 h-8 rounded-full bg-gray-500 mr-2 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-white truncate">
            <span className="truncate">
              {[user.displayName ?? '이름 없음', user.jobTitle].filter(Boolean).join(' ')}
            </span>
            {user.role === 'admin' && (
              <Star size={14} className="text-red-500 flex-shrink-0 fill-red-500" aria-hidden />
            )}
          </div>
          <div className="text-xs text-gray-400 truncate">
            {user.role === 'admin' ? '관리자' : '사용자'}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="로그아웃"
            aria-label="로그아웃"
          >
            <LogOut size={16} />
          </button>
          <Settings size={16} className="text-gray-400 hover:text-white cursor-pointer" />
        </div>
      </div>
    </div>
  );
};

/** 클릭 시 URL을 blob으로 받아 로컬에 다운로드 (외부 URL에서도 실제 다운로드 동작) */
const handleDownload = async (e: React.MouseEvent, url: string, fileName: string | null) => {
  e.preventDefault();
  e.stopPropagation();
  const name = fileName ?? new URL(url).pathname.split('/').pop() ?? 'download';
  try {
    await downloadFileFromUrl(url, decodeURIComponent(name));
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/** 파일 첨부가 있는 메시지의 표시 영역 */
const FileAttachment = ({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) => {
  if (!msg.fileUrl) return null;
  const image = msg.fileType ? isImageFile(msg.fileType) : false;

  if (image) {
    return (
      <div className="mt-1.5 relative group">
        <img
          src={msg.fileUrl}
          alt={msg.fileName ?? '이미지'}
          className="max-w-full max-h-64 rounded-lg object-cover"
          loading="lazy"
        />
        <a
          href={msg.fileUrl}
          onClick={(e) => handleDownload(e, msg.fileUrl!, msg.fileName)}
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
      <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isMe ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
      }`}>
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
};

const MainContent = ({
  selectedProject,
  selectedMenuData,
  activeTab,
  setActiveTab,
  user,
}: {
  selectedProject: Project;
  selectedMenuData: MiddleMenu;
  activeTab: 'chat' | 'automation';
  setActiveTab: (t: 'chat' | 'automation') => void;
  user: AppUser;
}) => {
  const { messages, sendMessage, sendFileMessage, loading, error, clearError } = useChat({
    projectId: selectedProject.id,
    subMenuId: selectedMenuData.id,
    currentUser: user,
  });

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const groupedByDate = React.useMemo(() => {
    const map = new Map<string, typeof messages>();
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

  const handleSend = async () => {
    const t = inputText.trim();
    if (!t) return;
    setInputText('');
    await sendMessage(t);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    clearError();
    setUploadProgress(0);
    try {
      await sendFileMessage(file, '', (percent) => setUploadProgress(percent));
    } catch {
      // error already set in hook
    } finally {
      setUploadProgress(null);
    }
  }, [sendFileMessage, clearError]);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      e.target.value = '';
    },
    [handleFileUpload]
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
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const uploading = uploadProgress !== null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
        <div className="flex items-center min-w-0">
          <div className="flex items-center text-gray-500 text-sm mr-2">
            <span className="font-medium text-gray-900">{selectedProject.name}</span>
            <ChevronRight size={14} className="mx-1" />
            <span className="font-medium text-brand-main">{selectedMenuData.name}</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="검색"
              className="pl-9 pr-4 py-1.5 bg-gray-100 border-none rounded-md text-sm focus:ring-2 focus:ring-brand-sub/50 outline-none w-48 transition-all"
            />
          </div>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <Filter size={18} />
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 pt-4 pb-0 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chat'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            채팅
          </button>
          <button
            onClick={() => setActiveTab('automation')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'automation'
                ? 'border-brand-main text-brand-main'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            자동화 작업
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative bg-brand-light/30">
        {activeTab === 'chat' ? (
          <div
            className="h-full flex flex-col relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-30 bg-brand-sub/10 border-2 border-dashed border-brand-sub rounded-lg flex items-center justify-center pointer-events-none">
                <div className="bg-white px-6 py-4 rounded-xl shadow-lg text-center">
                  <Paperclip size={32} className="mx-auto mb-2 text-brand-sub" />
                  <p className="text-sm font-medium text-gray-700">파일을 여기에 놓으세요</p>
                  <p className="text-xs text-gray-400 mt-1">최대 100MB</p>
                </div>
              </div>
            )}

            {/* Upload progress bar */}
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
                  <span className="text-xs text-gray-500 font-medium w-10 text-right">
                    {uploadProgress}%
                  </span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="text-center text-sm text-red-600 py-2">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="flex justify-center py-8 text-gray-500 text-sm">
                  메시지 불러오는 중…
                </div>
              ) : groupedByDate.length === 0 ? (
                <div className="flex justify-center py-8 text-gray-500 text-sm">
                  아직 메시지가 없습니다. 첫 메시지를 보내보세요.
                </div>
              ) : (
                groupedByDate.map(([dateLabel, msgs]) => (
                  <div key={dateLabel} className="space-y-4">
                    <div className="flex justify-center my-4">
                      <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {dateLabel}
                      </span>
                    </div>
                    {msgs.map((msg) => {
                      const isMe = msg.senderId === user.uid;
                      const displayName = [msg.senderDisplayName, msg.senderJobTitle].filter(Boolean).join(' ');
                      const timeStr = formatChatTime(msg.createdAt);
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
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
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                isMe
                                  ? 'bg-brand-main text-white rounded-tr-none'
                                  : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                              }`}
                            >
                              {msg.text && <p>{msg.text}</p>}
                              <FileAttachment msg={msg} isMe={isMe} />
                            </div>
                            {isMe && <span className="text-xs text-gray-400 mt-1 mr-1">{timeStr}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-sub/30 focus-within:border-brand-sub transition-all shadow-sm">
                <textarea
                  placeholder={`#${selectedMenuData.name}에 메시지 보내기`}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[40px] max-h-[120px] px-2 py-1"
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={uploading}
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 text-gray-400 hover:text-brand-sub hover:bg-gray-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="파일 첨부 (최대 100MB)"
                    >
                      <Paperclip size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="p-1.5 text-gray-400 hover:text-brand-sub hover:bg-gray-200 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      title="이미지 첨부"
                    >
                      <ImageIcon size={18} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!inputText.trim() || uploading}
                    className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center flex-col p-8 text-center">
            <div className="w-16 h-16 bg-brand-sub/10 rounded-full flex items-center justify-center mb-4 text-brand-sub">
              <selectedMenuData.icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedMenuData.name} 자동화 도구</h3>
            <p className="text-gray-500 max-w-md mb-6">
              이곳에서 {selectedMenuData.name} 관련 데이터를 입력하고 자동화 작업을 수행할 수 있습니다.
            </p>
            <button className="bg-brand-main hover:bg-brand-main/90 text-white px-6 py-2.5 rounded-lg font-medium shadow-md transition-transform active:scale-95">
              작업 시작하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const RightPanel = ({ selectedMenuData }: { selectedMenuData: MiddleMenu }) => {
  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
        <span className="font-semibold text-gray-700">정보 패널</span>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Checklist Card */}
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
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors ${
                  item.done 
                    ? 'bg-brand-sub border-brand-sub text-white' 
                    : 'border-gray-300 bg-white group-hover:border-brand-sub'
                }`}>
                  {item.done && <CheckSquare size={10} />}
                </div>
                <span className={`text-sm ${item.done ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Files */}
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
              <div key={idx} className="flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group">
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

        {/* Context Info */}
        <div className="bg-brand-main/5 rounded-xl border border-brand-main/10 p-4">
          <h4 className="font-semibold text-sm text-brand-main mb-2">
            {selectedMenuData.name} 가이드
          </h4>
          <p className="text-xs text-gray-600 leading-relaxed">
            이 단계에서는 현장에서 수집된 데이터를 기반으로 자동화된 분석을 수행합니다. 
            오른쪽 상단의 '자동화 작업' 탭에서 데이터를 입력해주세요.
          </p>
        </div>
      </div>
    </div>
  );
};

function NotificationListener() {
  const { user } = useAuth();
  const { addToast } = useToastContext();
  useNotifications({
    uid: user?.uid ?? null,
    onNew: (n) => {
      const message =
        n.type === 'task_completed'
          ? `${n.completedByDisplayName ?? '직원'}이(가) 업무를 완료했습니다.`
          : '새 업무가 할당되었습니다.';
      addToast({ title: n.title, message, taskId: n.taskId });
    },
  });
  return null;
}

export default function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [selectedMenuId, setSelectedMenuId] = useState<MiddleMenuId>('field-survey');
  const [activeTab, setActiveTab] = useState<'chat' | 'automation'>('chat');
  const [activeSection, setActiveSection] = useState<ActiveSection>('project');

  const selectedMenuData = MIDDLE_MENUS.find((m) => m.id === selectedMenuId) ?? MIDDLE_MENUS[0];
  const isTaskDetailPage = /^\/task\/[^/]+$/.test(location.pathname);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const mainContent = isTaskDetailPage ? (
    <TaskDetailPage />
  ) : activeSection === 'work-assign' ? (
    user.role === 'admin' ? (
      <WorkAssignAdminView currentUser={user} />
    ) : (
      <WorkAssignMyListView currentUser={user} />
    )
  ) : (
    <>
      <MainContent
        selectedProject={selectedProject}
        selectedMenuData={selectedMenuData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
      />
      <RightPanel selectedMenuData={selectedMenuData} />
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-brand-light">
      <NotificationListener />
      <NotificationToastContainer />
      <Sidebar
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        selectedMenu={selectedMenuId}
        setSelectedMenu={setSelectedMenuId}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 min-w-0 overflow-hidden">{mainContent}</div>
    </div>
  );
}
