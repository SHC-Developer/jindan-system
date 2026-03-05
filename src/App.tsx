import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useProjects } from './hooks/useProjects';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationToastContainer } from './components/NotificationToast';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { AdminPage } from './features/admin/AdminPage';
import { WorkAssignAdminView } from './features/work-assign/WorkAssignAdminView';
import { WorkAssignMyListView } from './features/work-assign/WorkAssignMyListView';
import { TaskDetailPage } from './features/work-assign/TaskDetailPage';
import { WorkLogDashboardView } from './features/worklog/WorkLogDashboardView';
import { WorkLogAdminView } from './features/worklog/WorkLogAdminView';
import { ProjectChatContent } from './features/project-chat/ProjectChatContent';
import { GeneralChatPage } from './features/general-chat/GeneralChatPage';
import { CadChatPage } from './features/cad-chat/CadChatPage';
import type { AppUser } from './types/user';
import type { Project } from './types/project';
import type { ActiveSection, MiddleMenuId } from './types/layout';
import { MIDDLE_MENUS } from './constants/navigation';

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
  onProfilePhotoDelete: () => Promise<void>
) {
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
  const [activeSection, setActiveSection] = useState<ActiveSection>('general-chat');
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

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
    () => deleteProfilePhotoAndUpdate()
  );

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
        <GeneralChatPage user={user} sidebarProps={sidebarProps} onLogout={handleLogout} />
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
        <CadChatPage user={user} sidebarProps={sidebarProps} onLogout={handleLogout} />
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
        <Sidebar {...sidebarProps} />
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
