import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Hash,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  Box,
  CheckSquare,
  Clock,
  Shield,
  FileText,
  Star,
  LogOut,
  Loader2,
  X,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { SidebarProps } from '../../types/layout';
import type { Project } from '../../types/project';
import { LOGO_URL, MIDDLE_MENUS } from '../../constants/navigation';
import { uploadProfilePhoto, isProfilePhotoType, PROFILE_PHOTO_MAX_SIZE } from '../../lib/storage';
import { updateAuthProfilePhoto, updateUserPhotoURLInFirestore } from '../../lib/auth';

export function Sidebar({
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
  onNavigateToDailyJournal,
  onNavigateToWorkLog,
  onNavigateToAdmin,
  onCreateProject,
  onUpdateProjectName,
  onDeleteProject,
  onAfterRename,
  isProjectsExpanded: isProjectsExpandedProp,
  setProjectsExpanded: setProjectsExpandedProp,
  onProfilePhotoUpdate,
  onProfilePhotoDelete,
}: SidebarProps) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const [profileUploading, setProfileUploading] = useState(false);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const isProjectsExpanded =
    setProjectsExpandedProp != null ? (isProjectsExpandedProp ?? true) : localExpanded;
  const setIsProjectsExpanded = setProjectsExpandedProp ?? setLocalExpanded;
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
      {/* Logo Area - 클릭 시 공지사항/일반채팅(메인 홈)으로 이동 */}
      <button
        type="button"
        onClick={() => {
          onNavigateToGeneralChat ? onNavigateToGeneralChat() : setActiveSection('general-chat');
        }}
        className="h-14 w-full flex items-center px-4 border-b border-gray-700/50 min-w-0 text-left hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
        lang="ko"
        title="공지사항/일반채팅으로 이동"
        aria-label="메인 홈, 공지사항/일반채팅으로 이동"
      >
        <img src={LOGO_URL} alt="" className="w-6 h-6 rounded-md mr-2 object-contain flex-shrink-0" />
        <span className="font-bold text-white tracking-tight whitespace-nowrap flex-shrink-0">
          KDVO 안전진단팀
        </span>
      </button>

      {/* Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="px-2 mb-2 space-y-0.5">
          <button
            onClick={() => {
              onNavigateToGeneralChat ? onNavigateToGeneralChat() : setActiveSection('general-chat');
            }}
            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
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
            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
              activeSection === 'cad'
                ? 'bg-brand-main text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Box size={16} className="mr-2 opacity-80" />
            <span className="truncate">CAD</span>
          </button>
        </div>

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
                          onClick={() => onNavigateToProject(project)}
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

        <div className="px-2 mt-4 pt-4 border-t border-gray-700/50 space-y-0.5">
          {onNavigateToDailyJournal && (
            <button
              onClick={onNavigateToDailyJournal}
              className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
                activeSection === 'daily-journal'
                  ? 'bg-brand-main text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <FileText size={16} className="mr-2 opacity-80" />
              <span className="truncate">
                {user.role === 'admin' ? '업무일지 확인' : '업무일지 작성하기'}
              </span>
            </button>
          )}
          <button
            onClick={onNavigateToWorkAssign}
            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
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
            className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
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
              className={`w-full text-left px-2 py-1.5 rounded-md flex items-center text-sm transition-colors ${
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

      <div className="p-4 bg-black/20 flex items-center">
        <input
          ref={profileFileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          aria-label="프로필 사진 선택"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file || !onProfilePhotoUpdate) return;
            if (!isProfilePhotoType(file.type)) {
              window.alert('프로필 사진은 JPG, PNG 형식만 지원합니다.');
              return;
            }
            if (file.size > PROFILE_PHOTO_MAX_SIZE) {
              window.alert('프로필 사진은 20MB 이하로 첨부해 주세요.');
              return;
            }
            setProfileUploading(true);
            try {
              const result = await uploadProfilePhoto(file, user.uid);
              await updateAuthProfilePhoto(result.downloadUrl);
              await updateUserPhotoURLInFirestore(user.uid, result.downloadUrl);
              onProfilePhotoUpdate(result.downloadUrl);
            } catch (err) {
              const message = err instanceof Error ? err.message : '프로필 사진 업로드에 실패했습니다.';
              window.alert(message);
            } finally {
              setProfileUploading(false);
            }
          }}
        />
        <button
          type="button"
          onClick={() => profileFileInputRef.current?.click()}
          disabled={profileUploading}
          className="w-8 h-8 rounded-full mr-2 flex-shrink-0 overflow-hidden bg-white flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#28AFB0] disabled:opacity-60 cursor-pointer"
          title="프로필 사진 변경"
          aria-label="프로필 사진 변경"
        >
          {profileUploading ? (
            <Loader2 size={18} className="text-white animate-spin" />
          ) : user.photoURL ? (
            <img
              src={user.photoURL}
              alt="프로필"
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={18} className="text-[#37392E]" />
          )}
        </button>
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
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {onProfilePhotoDelete && (
            <button
              type="button"
              onClick={onProfilePhotoDelete}
              disabled={profileUploading || !user.photoURL}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
              title="프로필 사진 삭제"
              aria-label="프로필 사진 삭제"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title="로그아웃"
            aria-label="로그아웃"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
