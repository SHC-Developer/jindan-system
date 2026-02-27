import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { usePinnedNotices } from './hooks/usePinnedNotices';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/NotificationToast';
import { AdminPage } from './features/admin/AdminPage';
import { WorkAssignAdminView } from './features/work-assign/WorkAssignAdminView';
import { WorkAssignMyListView } from './features/work-assign/WorkAssignMyListView';
import { TaskDetailPage } from './features/work-assign/TaskDetailPage';
import { WorkLogDashboardView } from './features/worklog/WorkLogDashboardView';
import { WorkLogAdminView } from './features/worklog/WorkLogAdminView';
import { formatChatDateLabel, formatChatTime } from './lib/chat-format';
import { downloadFileFromUrl } from './lib/download';
import { formatFileSize, isImageFile } from './lib/storage';
import type { AppUser } from './types/user';
import type { ChatMessage } from './types/chat';
import type { Project } from './types/project';
import { useProjects } from './hooks/useProjects';
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
  Trash2,
  MessageCircle,
  Pin,
  PinOff,
  Shield,
  Plus,
  Pencil,
  Box,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

/** public 폴더 기준 로고 경로 (Vite base URL 적용) */
const LOGO_URL = `${import.meta.env.BASE_URL}logo2.png`;

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

const MIDDLE_MENUS: MiddleMenu[] = [
  { id: 'quantity-extract', name: '물량표 추출', icon: BarChart3 },
  { id: 'photo-album', name: '사진첩 자동', icon: ImageIcon },
  { id: 'report-review', name: '보고서 작성 도구 및 검토', icon: FileText },
  { id: 'field-survey', name: '현장조사 자료 데이터 정리', icon: CheckSquare },
  { id: 'material-test', name: '재료시험 작성 도구', icon: Settings },
];

// --- Components ---

/** 공지사항/일반채팅용 Firestore 경로 (projects/general-notice/subMenus/general-chat/messages) */
const GENERAL_CHAT_PROJECT_ID = 'general-notice';
const GENERAL_CHAT_SUBMENU_ID = 'general-chat';

/** CAD 채팅용 Firestore 경로 (projects/cad/subMenus/chat/messages) */
const CAD_PROJECT_ID = 'cad';
const CAD_SUBMENU_ID = 'chat';

type ActiveSection = 'project' | 'work-assign' | 'worklog' | 'general-chat' | 'cad' | 'admin-page';

interface SidebarProps {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  selectedMenu: MiddleMenuId;
  setSelectedMenu: (m: MiddleMenuId) => void;
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  user: { displayName: string | null; jobTitle: string | null; role: 'admin' | 'general' };
  onLogout: () => void;
  onNavigateToGeneralChat?: () => void;
  onNavigateToCad?: () => void;
  onNavigateToProject: (project: Project) => void;
  onNavigateToWorkAssign: () => void;
  onNavigateToWorkLog: () => void;
  onNavigateToAdmin: () => void;
  onCreateProject: (name: string) => Promise<Project>;
  onUpdateProjectName: (projectId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onAfterRename?: (projectId: string, newName: string) => void;
}

const Sidebar = ({
  projects,
  projectsLoading,
  projectsError,
  selectedProject,
  setSelectedProject,
  selectedMenu,
  setSelectedMenu,
  activeSection,
  setActiveSection,
  user,
  onLogout,
  onNavigateToGeneralChat,
  onNavigateToCad,
  onNavigateToProject,
  onNavigateToWorkAssign,
  onNavigateToWorkLog,
  onNavigateToAdmin,
  onCreateProject,
  onUpdateProjectName,
  onDeleteProject,
  onAfterRename,
}: SidebarProps) => {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    project: Project | null;
  } | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, project: Project | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, project });
  };

  const handleDoubleClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    if (user.role !== 'admin') return;
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const saveRename = useCallback(async () => {
    if (!editingProjectId || !editingName.trim()) {
      setEditingProjectId(null);
      return;
    }
    const newName = editingName.trim();
    try {
      await onUpdateProjectName(editingProjectId, newName);
      onAfterRename?.(editingProjectId, newName);
      setEditingProjectId(null);
    } catch (err) {
      console.error(err);
    }
  }, [editingProjectId, editingName, onUpdateProjectName, onAfterRename]);

  const handleDelete = useCallback(
    async (project: Project) => {
      setContextMenu(null);
      if (user.role !== 'admin') return;
      if (!window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까? 관련 채팅 등 모든 데이터가 삭제됩니다.`)) return;
      try {
        await onDeleteProject(project.id);
      } catch (err) {
        console.error(err);
      }
    },
    [user.role, onDeleteProject]
  );

  const handleCreateProject = useCallback(async () => {
    const name = newProjectName.trim();
    if (!name) return;
    setCreateLoading(true);
    try {
      await onCreateProject(name);
      setNewProjectOpen(false);
      setNewProjectName('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  }, [newProjectName, onCreateProject]);

  return (
    <div className="w-64 bg-brand-dark text-gray-300 flex flex-col h-full flex-shrink-0">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 border-b border-gray-700/50 min-w-0" lang="ko">
        <img src={LOGO_URL} alt="" className="w-6 h-6 rounded-md mr-2 object-contain flex-shrink-0" />
        <span className="font-bold text-white tracking-tight whitespace-nowrap flex-shrink-0" title="KDVO 안전진단팀">
          KDVO 안전진단팀
        </span>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4">
        {/* 공지사항/일반채팅 (프로젝트 위) - 클릭 시 /general-chat 라우트로 이동 */}
        <div className="px-2 mb-2">
          <button
            onClick={() => {
              onNavigateToGeneralChat ? onNavigateToGeneralChat() : setActiveSection('general-chat');
            }}
            className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
              activeSection === 'general-chat'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <MessageCircle size={16} className="mr-2 opacity-80" />
            <span className="truncate">공지사항/일반채팅</span>
          </button>
          <button
            onClick={() => {
              onNavigateToCad ? onNavigateToCad() : setActiveSection('cad');
            }}
            className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors mt-1 ${
              activeSection === 'cad'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Box size={16} className="mr-2 opacity-80" />
            <span className="truncate">CAD</span>
          </button>
        </div>

        {/* Projects Section */}
        <div className="px-2 mb-2" ref={sidebarRef}>
          <div
            className="flex items-center justify-between w-full mb-1"
            onContextMenu={(e) => handleContextMenu(e, null)}
          >
            <button
              onClick={() => setIsProjectsExpanded(!isProjectsExpanded)}
              className="flex items-center justify-between flex-1 min-w-0 px-2 py-1 text-xs font-semibold text-gray-400 hover:text-white uppercase tracking-wider"
            >
              <span>프로젝트</span>
              {isProjectsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button
              type="button"
              onClick={() => setNewProjectOpen(true)}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
              title="새 프로젝트"
              aria-label="새 프로젝트"
            >
              <Plus size={14} />
            </button>
          </div>

          <AnimatePresence>
            {isProjectsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-0.5"
              >
                {projectsLoading && (
                  <div className="px-2 py-2 text-xs text-gray-500">불러오는 중…</div>
                )}
                {!projectsLoading && projectsError && (
                  <div className="px-2 py-2 text-xs text-red-400">{projectsError}</div>
                )}
                {!projectsLoading && !projectsError && projects.map((project) => (
                  <div key={project.id}>
                    <div
                      className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
                        selectedProject?.id === project.id && activeSection === 'project'
                          ? 'bg-white/10 text-white font-medium'
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, project)}
                      onDoubleClick={(e) => handleDoubleClick(e, project)}
                    >
                      {editingProjectId === project.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={saveRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename();
                            if (e.key === 'Escape') setEditingProjectId(null);
                          }}
                          className="flex-1 min-w-0 px-1 py-0.5 text-sm bg-white/10 text-white rounded border border-white/20 focus:outline-none focus:ring-1 focus:ring-brand-sub"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToProject(project);
                          }}
                          className="w-full text-left flex items-center min-w-0"
                        >
                          <Hash size={16} className="mr-2 opacity-70 flex-shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </button>
                      )}
                    </div>

                    {selectedProject?.id === project.id && activeSection === 'project' && (
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

        {contextMenu && (
          <div
            className="fixed z-50 min-w-[160px] py-1 bg-brand-dark border border-gray-600 rounded-lg shadow-xl"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                setNewProjectOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
            >
              <Plus size={14} /> 새 프로젝트
            </button>
            {contextMenu.project && user.role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProjectId(contextMenu.project!.id);
                    setEditingName(contextMenu.project!.name);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2"
                >
                  <Pencil size={14} /> 이름 수정
                </button>
                <button
                  type="button"
                  onClick={() => contextMenu.project && handleDelete(contextMenu.project)}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-white/10 flex items-center gap-2"
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </>
            )}
          </div>
        )}

        {newProjectOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !createLoading && setNewProjectOpen(false)}>
            <div className="bg-brand-dark rounded-lg p-4 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-semibold text-white mb-2">새 프로젝트</h3>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="프로젝트 이름"
                className="w-full px-3 py-2 text-sm bg-white/10 text-white rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-sub mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !createLoading && setNewProjectOpen(false)}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleCreateProject}
                  disabled={createLoading || !newProjectName.trim()}
                  className="px-3 py-1.5 text-sm bg-brand-main text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                >
                  {createLoading && <Loader2 size={14} className="animate-spin" />}
                  만들기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 업무 지시 (프로젝트와 별도 블록) */}
        <div className="px-2 mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={onNavigateToWorkAssign}
            className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
              activeSection === 'work-assign'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <CheckSquare size={16} className="mr-2 opacity-80" />
            <span className="truncate">
              {user.role === 'admin' ? '업무 지시하기(현황)' : '업무 지시사항 확인'}
            </span>
          </button>
          <button
            onClick={onNavigateToWorkLog}
            className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors mt-1 ${
              activeSection === 'worklog'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Clock size={16} className="mr-2 opacity-80" />
            <span className="truncate">출퇴근 기록부</span>
          </button>
          {user.role === 'admin' && (
            <button
              onClick={onNavigateToAdmin}
              className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors mt-1 ${
                activeSection === 'admin-page'
                  ? 'bg-brand-main text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Shield size={16} className="mr-2 opacity-80" />
              <span className="truncate">관리자 페이지</span>
            </button>
          )}
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
  const { messages, sendMessage, sendFileMessage, deleteMessage, canDeleteMessage, loading, error, clearError } =
    useChat({
      projectId: selectedProject.id,
      subMenuId: selectedMenuData.id,
      currentUser: user,
    });

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
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
                      const showDelete = canDeleteMessage(msg, user);
                      const isDeleting = deletingMessageId === msg.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
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
                                <FileAttachment msg={msg} isMe={isMe} />
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
                                  {isDeleting ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
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

/** 공지사항/일반채팅 전용 전체 레이아웃: 상단 다크 헤더(로고+중앙 입력/전송) + 밝은 채팅 영역 + 우측 패널 */
const GeneralChatPage = ({
  user,
  sidebarProps,
  onLogout,
}: {
  user: AppUser;
  sidebarProps: SidebarProps;
  onLogout: () => void;
}) => {
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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const pinnedMessages = React.useMemo(
    () => messages.filter((m) => pinnedMessageIds.includes(m.id)),
    [messages, pinnedMessageIds]
  );

  /* 공지는 상단에 따로 노출하고, 채팅 목록은 시간순 전체(messages)로 표시해 공지 메시지도 원래 자리에 남김 */
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

  const handleFileUpload = useCallback(
    async (file: File) => {
      clearError();
      setUploadProgress(0);
      try {
        await sendFileMessage(file, '', (percent) => setUploadProgress(percent));
      } catch {
        // error already set in hook
      } finally {
        setUploadProgress(null);
      }
    },
    [sendFileMessage, clearError]
  );

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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden font-sans bg-brand-light">
      {/* 상단 전체 너비 다크 헤더: 로고만 (채팅 입력은 하단만) */}
      <header className="h-14 w-full flex-shrink-0 flex items-center px-4 bg-brand-dark text-white">
        <span className="font-bold tracking-tight whitespace-nowrap flex items-center gap-2">
          <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" aria-hidden />
          KDVO 안전진단팀
        </span>
      </header>

      {/* 하단: 사이드바 | 채팅 영역(밝은 배경) | 우측 패널 */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar {...sidebarProps} />
        <div className="flex flex-1 min-w-0 overflow-hidden">
          {/* 중앙 채팅 영역 - 보조 컬러 2 #EEE5E5 배경, 메시지 목록 + 하단 입력 */}
          <div
            className="flex-1 flex flex-col min-w-0 bg-brand-light overflow-hidden"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />

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

            <p className="px-6 pt-4 text-sm text-gray-500 flex-shrink-0">공지사항/일반채팅에 메시지 보내기</p>
            <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0">
              {error && <div className="text-center text-sm text-red-600 py-2">{error}</div>}
              {loading ? (
                <div className="flex justify-center py-8 text-gray-500 text-sm">메시지 불러오는 중…</div>
              ) : (
                <>
                  {/* 상단 고정 공지 (핀) */}
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
                                    <FileAttachment msg={msg} isMe={isMe} />
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
                            <FileAttachment msg={msg} isMe={isMe} />
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

            {/* 하단 입력: 클립, 이미지, 전송 (참고 이미지와 동일) */}
            <div className="p-4 bg-brand-light border-t border-gray-200 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-sub/30 focus-within:border-brand-sub transition-all shadow-sm">
                <textarea
                  placeholder="공지사항/일반채팅에 메시지 보내기"
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[40px] max-h-[120px] px-2 py-1 text-gray-900"
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
                    onClick={handleSend}
                    disabled={!inputText.trim() || uploading}
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

      {/* 우클릭 컨텍스트 메뉴: 공지로 등록하기 / 공지 해제 */}
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
};

/** CAD 채팅 전용 레이아웃: 일반채팅과 동일 구조, projects/cad/subMenus/chat 사용 */
const CadChatPage = ({
  user,
  sidebarProps,
  onLogout,
}: {
  user: AppUser;
  sidebarProps: SidebarProps;
  onLogout: () => void;
}) => {
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
    projectId: CAD_PROJECT_ID,
    subMenuId: CAD_SUBMENU_ID,
    currentUser: user,
  });

  const { pinnedMessageIds, addPinned, removePinned } = usePinnedNotices({
    projectId: CAD_PROJECT_ID,
    subMenuId: CAD_SUBMENU_ID,
  });

  const [inputText, setInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: ChatMessage } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

  const handleFileUpload = useCallback(
    async (file: File) => {
      clearError();
      setUploadProgress(0);
      try {
        await sendFileMessage(file, '', (percent) => setUploadProgress(percent));
      } catch {
        // error already set in hook
      } finally {
        setUploadProgress(null);
      }
    },
    [sendFileMessage, clearError]
  );

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

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden font-sans bg-brand-light">
      <header className="h-14 w-full flex-shrink-0 flex items-center px-4 bg-brand-dark text-white">
        <span className="font-bold tracking-tight whitespace-nowrap flex items-center gap-2">
          <img src={LOGO_URL} alt="" className="h-6 w-6 object-contain" aria-hidden />
          KDVO 안전진단팀
        </span>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar {...sidebarProps} />
        <div className="flex flex-1 min-w-0 overflow-hidden">
          <div
            className="flex-1 flex flex-col min-w-0 bg-brand-light overflow-hidden"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInputChange} />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileInputChange} />

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

            <p className="px-6 pt-4 text-sm text-gray-500 flex-shrink-0">CAD 채팅에 메시지 보내기</p>
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
                                    <FileAttachment msg={msg} isMe={isMe} />
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
                                    <FileAttachment msg={msg} isMe={isMe} />
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

            <div className="p-4 bg-brand-light border-t border-gray-200 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-sub/30 focus-within:border-brand-sub transition-all shadow-sm">
                <textarea
                  placeholder="CAD에 메시지 보내기"
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[40px] max-h-[120px] px-2 py-1 text-gray-900"
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
                    onClick={handleSend}
                    disabled={!inputText.trim() || uploading}
                    className="bg-brand-main hover:bg-brand-main/90 disabled:opacity-50 text-white p-2 rounded-lg shadow-sm flex items-center justify-center"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <RightPanel selectedMenuData={{ name: 'CAD' }} />
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
};

/** 우측 패널 (프로젝트 채팅/공지사항 채팅 공통) - selectedMenuData.name으로 가이드 제목 사용, 배경 보조 컬러 2 */
const RightPanel = ({ selectedMenuData }: { selectedMenuData: { name: string } }) => {
  return (
    <div className="w-80 bg-brand-light border-l border-gray-200 flex flex-col h-full flex-shrink-0">
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-brand-light">
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

export default function App() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    createProject: onCreateProject,
    updateProjectName: onUpdateProjectName,
    deleteProject: onDeleteProject,
  } = useProjects(user?.uid);

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState<MiddleMenuId>('field-survey');
  const [activeTab, setActiveTab] = useState<'chat' | 'automation'>('chat');
  const [activeSection, setActiveSection] = useState<ActiveSection>('general-chat');

  const selectedMenuData = MIDDLE_MENUS.find((m) => m.id === selectedMenuId) ?? MIDDLE_MENUS[0];
  const isTaskDetailPage = /^\/task\/[^/]+$/.test(location.pathname);

  // URL → 상태 동기화 (새로고침·북마크)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') {
      navigate('/general-chat', { replace: true });
      return;
    }
    if (path === '/general-chat') {
      setActiveSection('general-chat');
      return;
    }
    if (path === '/cad') {
      setActiveSection('cad');
      return;
    }
    if (path === '/work-assign') {
      setActiveSection('work-assign');
      return;
    }
    if (path === '/work-log') {
      setActiveSection('worklog');
      return;
    }
    if (path === '/admin') {
      setActiveSection('admin-page');
      return;
    }
    const projectMatch = path.match(/^\/project\/(.+)$/);
    if (projectMatch && !projectsLoading && projects.length > 0) {
      try {
        const name = decodeURIComponent(projectMatch[1]);
        const project = projects.find((p) => p.name === name);
        if (project) {
          setActiveSection('project');
          setSelectedProject(project);
        }
      } catch {
        // ignore decode error
      }
    }
  }, [location.pathname, projectsLoading, projects, navigate]);

  // 프로젝트 로드 후 첫 프로젝트 선택 (URL이 /project/...가 아닐 때)
  useEffect(() => {
    if (projectsLoading || projects.length === 0) return;
    const path = location.pathname;
    if (path.startsWith('/project/')) return;
    if (activeSection === 'project' && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projectsLoading, projects, activeSection, selectedProject, location.pathname]);

  // 선택한 프로젝트가 삭제된 경우 선택 해제 및 general-chat으로 이동
  useEffect(() => {
    if (selectedProject && !projectsLoading && !projects.some((p) => p.id === selectedProject.id)) {
      setSelectedProject(projects[0] ?? null);
      setActiveSection(projects.length > 0 ? 'project' : 'general-chat');
      navigate(projects.length > 0 ? '/project/' + encodeURIComponent(projects[0].name) : '/general-chat', {
        replace: true,
      });
    }
  }, [projects, projectsLoading, selectedProject, navigate]);

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
  ) : activeSection === 'worklog' ? (
    user.role === 'admin' ? (
      <WorkLogAdminView currentUser={user} />
    ) : (
      <WorkLogDashboardView currentUser={user} />
    )
  ) : activeSection === 'admin-page' ? (
    <AdminPage />
  ) : activeSection === 'general-chat' || activeSection === 'cad' ? null : activeSection === 'project' && selectedProject ? (
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
  ) : (
    <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
      프로젝트를 선택하거나 새로 만드세요.
    </div>
  );

  if (activeSection === 'general-chat') {
    return (
      <NotificationProvider>
        <NotificationToastContainer />
        <GeneralChatPage
          user={user}
          sidebarProps={{
            projects,
            projectsLoading,
            projectsError,
            selectedProject,
            setSelectedProject,
            selectedMenu: selectedMenuId,
            setSelectedMenu: setSelectedMenuId,
            activeSection,
            setActiveSection,
            user,
            onLogout: handleLogout,
            onNavigateToGeneralChat: () => {
              navigate('/general-chat');
              setActiveSection('general-chat');
            },
            onNavigateToCad: () => {
              navigate('/cad');
              setActiveSection('cad');
            },
            onNavigateToProject: (project) => {
              navigate('/project/' + encodeURIComponent(project.name));
              setActiveSection('project');
              setSelectedProject(project);
            },
            onNavigateToWorkAssign: () => {
              navigate('/work-assign');
              setActiveSection('work-assign');
            },
            onNavigateToWorkLog: () => {
              navigate('/work-log');
              setActiveSection('worklog');
            },
            onNavigateToAdmin: () => {
              navigate('/admin');
              setActiveSection('admin-page');
            },
            onCreateProject,
            onUpdateProjectName,
            onDeleteProject,
            onAfterRename: (_, newName) =>
              navigate('/project/' + encodeURIComponent(newName), { replace: true }),
          }}
          onLogout={handleLogout}
        />
      </NotificationProvider>
    );
  }

  if (activeSection === 'cad') {
    return (
      <NotificationProvider>
        <NotificationToastContainer />
        <CadChatPage
          user={user}
          sidebarProps={{
            projects,
            projectsLoading,
            projectsError,
            selectedProject,
            setSelectedProject,
            selectedMenu: selectedMenuId,
            setSelectedMenu: setSelectedMenuId,
            activeSection,
            setActiveSection,
            user,
            onLogout: handleLogout,
            onNavigateToGeneralChat: () => {
              navigate('/general-chat');
              setActiveSection('general-chat');
            },
            onNavigateToCad: () => {
              navigate('/cad');
              setActiveSection('cad');
            },
            onNavigateToProject: (project) => {
              navigate('/project/' + encodeURIComponent(project.name));
              setActiveSection('project');
              setSelectedProject(project);
            },
            onNavigateToWorkAssign: () => {
              navigate('/work-assign');
              setActiveSection('work-assign');
            },
            onNavigateToWorkLog: () => {
              navigate('/work-log');
              setActiveSection('worklog');
            },
            onNavigateToAdmin: () => {
              navigate('/admin');
              setActiveSection('admin-page');
            },
            onCreateProject,
            onUpdateProjectName,
            onDeleteProject,
            onAfterRename: (_, newName) =>
              navigate('/project/' + encodeURIComponent(newName), { replace: true }),
          }}
          onLogout={handleLogout}
        />
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider>
    <div className="flex h-screen w-full overflow-hidden font-sans bg-brand-light">
      <NotificationToastContainer />
      <Sidebar
        projects={projects}
        projectsLoading={projectsLoading}
        projectsError={projectsError}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        selectedMenu={selectedMenuId}
        setSelectedMenu={setSelectedMenuId}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        user={user}
        onLogout={handleLogout}
        onNavigateToGeneralChat={() => {
          navigate('/general-chat');
          setActiveSection('general-chat');
        }}
        onNavigateToCad={() => {
          navigate('/cad');
          setActiveSection('cad');
        }}
        onNavigateToProject={(project) => {
          navigate('/project/' + encodeURIComponent(project.name));
          setActiveSection('project');
          setSelectedProject(project);
        }}
        onNavigateToWorkAssign={() => {
          navigate('/work-assign');
          setActiveSection('work-assign');
        }}
        onNavigateToWorkLog={() => {
          navigate('/work-log');
          setActiveSection('worklog');
        }}
        onNavigateToAdmin={() => {
          navigate('/admin');
          setActiveSection('admin-page');
        }}
        onCreateProject={onCreateProject}
        onUpdateProjectName={onUpdateProjectName}
        onDeleteProject={onDeleteProject}
        onAfterRename={(_, newName) =>
          navigate('/project/' + encodeURIComponent(newName), { replace: true })
        }
      />
      <div className="flex flex-1 min-w-0 overflow-hidden w-full">
        {isTaskDetailPage || activeSection === 'work-assign' || activeSection === 'worklog' || activeSection === 'admin-page' ? (
          <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{mainContent}</div>
        ) : (
          mainContent
        )}
      </div>
    </div>
    </NotificationProvider>
  );
}
