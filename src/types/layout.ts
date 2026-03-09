import type React from 'react';
import type { Project } from './project';

export type MiddleMenuId =
  | 'quantity-extract'
  | 'photo-album'
  | 'report-review'
  | 'field-survey'
  | 'material-test';

export interface MiddleMenu {
  id: MiddleMenuId;
  name: string;
  icon: React.ElementType;
}

export type ActiveSection =
  | 'project'
  | 'work-assign'
  | 'daily-journal'
  | 'worklog'
  | 'general-chat'
  | 'cad'
  | 'admin-page'
  | 'personnel';

export type SpecialistViewMode = 'admin' | 'general';

export interface SidebarProps {
  projects: Project[];
  projectsLoading: boolean;
  projectsError: string | null;
  selectedProject: Project | null;
  setSelectedProject: (p: Project | null) => void;
  selectedMenu: MiddleMenuId;
  setSelectedMenu: (m: MiddleMenuId) => void;
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  user: { uid: string; displayName: string | null; jobTitle: string | null; role: 'admin' | 'general'; photoURL: string | null; isSpecialist?: boolean };
  /** specialist 전용: 현재 보고 있는 뷰 모드 */
  specialistViewMode?: SpecialistViewMode;
  onToggleSpecialistViewMode?: () => void;
  onLogout: () => void;
  onProfilePhotoUpdate?: (url: string) => void;
  onProfilePhotoDelete?: () => void;
  onNavigateToGeneralChat?: () => void;
  onNavigateToCad?: () => void;
  onNavigateToProject: (project: Project) => void;
  onNavigateToWorkAssign: () => void;
  onNavigateToDailyJournal?: () => void;
  onNavigateToWorkLog: () => void;
  onNavigateToAdmin: () => void;
  onNavigateToPersonnel?: () => void;
  onCreateProject: (name: string) => Promise<Project>;
  onUpdateProjectName: (projectId: string, name: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onAfterRename?: (projectId: string, newName: string) => void;
  /** 프로젝트 메뉴 접기/펼치기. 전달 시 사이드바 상태가 화면 이동 시에도 유지됨 */
  isProjectsExpanded?: boolean;
  setProjectsExpanded?: (expanded: boolean) => void;
  /** 모바일 사이드바 열림 여부 */
  isMobileOpen?: boolean;
  /** 모바일 사이드바 닫기 핸들러 */
  onCloseMobile?: () => void;
  /** 모바일 사이드바 열기 핸들러 (채팅 페이지 헤더용) */
  onOpenMobile?: () => void;
}
