import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Menu } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/NotificationToast';
import { GlobalToastContainer } from './components/GlobalToast';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { canAccessAdmin } from './lib/auth';
import type { AppUser } from './types/user';
import type { Project } from './types/project';
import type { ActiveSection, MiddleMenuId, SpecialistViewMode, SidebarProps } from './types/layout';
import { MIDDLE_MENUS } from './constants/navigation';

const AdminPage = React.lazy(() => import('./features/admin/AdminPage').then(m => ({ default: m.AdminPage })));
const WorkAssignAdminView = React.lazy(() => import('./features/work-assign/WorkAssignAdminView').then(m => ({ default: m.WorkAssignAdminView })));
const WorkAssignMyListView = React.lazy(() => import('./features/work-assign/WorkAssignMyListView').then(m => ({ default: m.WorkAssignMyListView })));
const TaskDetailPage = React.lazy(() => import('./features/work-assign/TaskDetailPage').then(m => ({ default: m.TaskDetailPage })));
const WorkLogDashboardView = React.lazy(() => import('./features/worklog/WorkLogDashboardView').then(m => ({ default: m.WorkLogDashboardView })));
const WorkLogAdminView = React.lazy(() => import('./features/worklog/WorkLogAdminView').then(m => ({ default: m.WorkLogAdminView })));
const DailyJournalWriteView = React.lazy(() => import('./features/daily-journal/DailyJournalWriteView').then(m => ({ default: m.DailyJournalWriteView })));
const DailyJournalAdminView = React.lazy(() => import('./features/daily-journal/DailyJournalAdminView').then(m => ({ default: m.DailyJournalAdminView })));
const ProjectChatContent = React.lazy(() => import('./features/project-chat/ProjectChatContent').then(m => ({ default: m.ProjectChatContent })));
const GeneralChatPage = React.lazy(() => import('./features/general-chat/GeneralChatPage').then(m => ({ default: m.GeneralChatPage })));
const CadChatPage = React.lazy(() => import('./features/cad-chat/CadChatPage').then(m => ({ default: m.CadChatPage })));

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <Loader2 size={28} className="animate-spin text-brand-main" />
    </div>
  );
}

function buildSidebarProps(
  user: AppUser,
  projects: Project[],
  projectsLoading: boolean,
  projectsError: string | null,
  selectedProject: Project | null,
  setSelectedProject: (p: Project | null) => void,
  selectedMenuId: MiddleMenuId,
  setSelectedMenuId: (m: MiddleMenuId) => void,
  activeSection: ActiveSection,
  setActiveSection: (s: ActiveSection) => void,
  isProjectsExpanded: boolean,
  setIsProjectsExpanded: (expanded: boolean) => void,
  navigate: (path: string, opts?: { replace?: boolean }) => void,
  handleLogout: () => void,
  onCreateProject: (name: string) => Promise<Project>,
  onUpdateProjectName: (projectId: string, name: string) => Promise<void>,
  onDeleteProject: (projectId: string) => Promise<void>,
  onProfilePhotoUpdate: (url: string) => void,
  onProfilePhotoDelete: () => Promise<void>,
  specialistViewMode?: SpecialistViewMode,
  onToggleSpecialistViewMode?: () => void
): SidebarProps {
  return {
  projects,
  projectsLoading,
  projectsError,
  selectedProject,
  setSelectedProject,
  selectedMenu: selectedMenuId,
  setSelectedMenu: setSelectedMenuId,
  activeSection,
  setActiveSection,
  isProjectsExpanded,
  setProjectsExpanded: setIsProjectsExpanded,
  user,
  specialistViewMode,
  onToggleSpecialistViewMode,
  onLogout: handleLogout,
  onProfilePhotoUpdate,
  onProfilePhotoDelete,
    onNavigateToGeneralChat: () => {
      navigate('/general-chat');
      setActiveSection('general-chat');
    },
    onNavigateToCad: () => {
      navigate('/cad');
      setActiveSection('cad');
    },
    onNavigateToProject: (project: Project) => {
      navigate('/project/' + encodeURIComponent(project.name));
      setActiveSection('project');
      setSelectedProject(project);
    },
    onNavigateToWorkAssign: () => {
      navigate('/work-assign');
      setActiveSection('work-assign');
    },
    onNavigateToDailyJournal: () => {
      navigate('/daily-journal');
      setActiveSection('daily-journal');
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
    onAfterRename: (_: string, newName: string) =>
      navigate('/project/' + encodeURIComponent(newName), { replace: true }),
  };
}

export default function App() {
  const { user, signOut, updateProfilePhotoUrl, deleteProfilePhotoAndUpdate } = useAuth();
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('general-chat');
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [specialistViewMode, setSpecialistViewMode] = useState<SpecialistViewMode>('admin');

  const selectedMenuData = MIDDLE_MENUS.find((m) => m.id === selectedMenuId) ?? MIDDLE_MENUS[0];
  const isTaskDetailPage = /^\/task\/[^/]+$/.test(location.pathname);

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
    if (path === '/daily-journal') {
      setActiveSection('daily-journal');
      return;
    }
    if (path === '/work-log') {
      setActiveSection('worklog');
      return;
    }
    if (path === '/admin') {
      if (user && canAccessAdmin(user)) {
        setActiveSection('admin-page');
      } else {
        navigate('/general-chat', { replace: true });
      }
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

  useEffect(() => {
    if (projectsLoading || projects.length === 0) return;
    const path = location.pathname;
    if (path.startsWith('/project/')) return;
    if (activeSection === 'project' && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projectsLoading, projects, activeSection, selectedProject, location.pathname]);

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

  const sidebarProps = buildSidebarProps(
    user,
    projects,
    projectsLoading,
    projectsError,
    selectedProject,
    setSelectedProject,
    selectedMenuId,
    setSelectedMenuId,
    activeSection,
    setActiveSection,
    isProjectsExpanded,
    setIsProjectsExpanded,
    navigate,
    handleLogout,
    onCreateProject,
    onUpdateProjectName,
    onDeleteProject,
    (url) => updateProfilePhotoUrl(url),
    () => deleteProfilePhotoAndUpdate(),
    user.isSpecialist ? specialistViewMode : undefined,
    user.isSpecialist ? () => setSpecialistViewMode((m) => (m === 'admin' ? 'general' : 'admin')) : undefined
  );
  sidebarProps.isMobileOpen = isMobileSidebarOpen;
  sidebarProps.onCloseMobile = () => setIsMobileSidebarOpen(false);
  sidebarProps.onOpenMobile = () => setIsMobileSidebarOpen(true);

  const showAdminView = user.isSpecialist
    ? specialistViewMode === 'admin'
    : canAccessAdmin(user);

  const mainContent = isTaskDetailPage ? (
    <TaskDetailPage />
  ) : activeSection === 'work-assign' ? (
    showAdminView ? (
      <WorkAssignAdminView currentUser={user} />
    ) : (
      <WorkAssignMyListView currentUser={user} />
    )
  ) : activeSection === 'worklog' ? (
    showAdminView ? (
      <WorkLogAdminView currentUser={user} />
    ) : (
      <WorkLogDashboardView currentUser={user} />
    )
  ) : activeSection === 'daily-journal' ? (
    showAdminView ? (
      <DailyJournalAdminView currentUser={user} />
    ) : (
      <DailyJournalWriteView currentUser={user} />
    )
  ) : activeSection === 'admin-page' ? (
    canAccessAdmin(user) ? <AdminPage /> : null
  ) : activeSection === 'general-chat' || activeSection === 'cad' ? null : activeSection === 'project' && selectedProject ? (
    <>
      <ProjectChatContent
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
      <NotificationProvider
        onNavigateToWorkLog={() => {
          navigate('/work-log');
          setActiveSection('worklog');
        }}
      >
        <NotificationToastContainer />
        <GlobalToastContainer />
        <Suspense fallback={<PageFallback />}>
          <GeneralChatPage user={user} sidebarProps={sidebarProps} onLogout={handleLogout} />
        </Suspense>
      </NotificationProvider>
    );
  }

  if (activeSection === 'cad') {
    return (
      <NotificationProvider
        onNavigateToWorkLog={() => {
          navigate('/work-log');
          setActiveSection('worklog');
        }}
      >
        <NotificationToastContainer />
        <GlobalToastContainer />
        <Suspense fallback={<PageFallback />}>
          <CadChatPage user={user} sidebarProps={sidebarProps} onLogout={handleLogout} />
        </Suspense>
      </NotificationProvider>
    );
  }

  return (
    <NotificationProvider
      onNavigateToWorkLog={() => {
        navigate('/work-log');
        setActiveSection('worklog');
      }}
    >
    <div className="flex h-screen w-full overflow-hidden font-sans bg-brand-light">
      <NotificationToastContainer />
      <GlobalToastContainer />
        <Sidebar {...sidebarProps} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden w-full">
        <div className="h-12 flex items-center px-3 border-b border-gray-200 bg-white flex-shrink-0 md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 -ml-1 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="메뉴 열기"
          >
            <Menu size={22} />
          </button>
          <span className="ml-2 text-sm font-semibold text-brand-dark truncate">KDVO 안전진단팀</span>
        </div>
        <div className="flex flex-1 min-w-0 overflow-hidden w-full">
          <Suspense fallback={<PageFallback />}>
            {isTaskDetailPage || activeSection === 'work-assign' || activeSection === 'worklog' || activeSection === 'daily-journal' || activeSection === 'admin-page' ? (
              <div className="w-full h-full min-h-0 min-w-0 overflow-hidden">{mainContent}</div>
            ) : (
              mainContent
            )}
          </Suspense>
        </div>
      </div>
    </div>
    </NotificationProvider>
  );
}
