import React, { useState } from 'react';
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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types & Mock Data ---

type MiddleMenuId = 'quantity' | 'photo' | 'report' | 'field_data' | 'material_test';

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
  { id: 'p1', name: '경기도 교량A' },
  { id: 'p2', name: '경기도 교량B' },
  { id: 'p3', name: '서울시 터널C' },
];

const MIDDLE_MENUS: MiddleMenu[] = [
  { id: 'quantity', name: '물량표 추출', icon: BarChart3 },
  { id: 'photo', name: '사진첩 자동', icon: ImageIcon },
  { id: 'report', name: '보고서 작성 도구 및 검토', icon: FileText },
  { id: 'field_data', name: '현장조사 자료 데이터 정리', icon: CheckSquare },
  { id: 'material_test', name: '재료시험 작성 도구', icon: Settings },
];

const MOCK_MESSAGES = [
  {
    id: 1,
    user: '김철수 팀장',
    avatar: 'https://picsum.photos/seed/user1/40/40',
    time: '오전 10:30',
    content: '경기도 교량A 현장조사 데이터 정리가 거의 완료되었습니다. 확인 부탁드립니다.',
    isMe: false,
  },
  {
    id: 2,
    user: '이영희 대리',
    avatar: 'https://picsum.photos/seed/user2/40/40',
    time: '오전 10:35',
    content: '네, 알겠습니다. 지금 바로 확인해보겠습니다. 혹시 특이사항 있었나요?',
    isMe: true,
  },
  {
    id: 3,
    user: '김철수 팀장',
    avatar: 'https://picsum.photos/seed/user1/40/40',
    time: '오전 10:36',
    content: '3번 교각 하부 균열이 예상보다 심각해서 사진을 추가로 찍어두었습니다. 사진첩 자동화 탭에서 확인 가능합니다.',
    isMe: false,
  },
  {
    id: 4,
    user: '박지성 주임',
    avatar: 'https://picsum.photos/seed/user3/40/40',
    time: '오전 10:40',
    content: '참고로 재료시험 결과표도 방금 업로드했습니다.',
    isMe: false,
  },
];

// --- Components ---

const Sidebar = ({ 
  selectedProject, 
  setSelectedProject, 
  selectedMenu, 
  setSelectedMenu 
}: {
  selectedProject: Project;
  setSelectedProject: (p: Project) => void;
  selectedMenu: MiddleMenuId;
  setSelectedMenu: (m: MiddleMenuId) => void;
}) => {
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  return (
    <div className="w-64 bg-brand-dark text-gray-300 flex flex-col h-full flex-shrink-0">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-4 border-b border-gray-700/50">
        <div className="w-6 h-6 bg-brand-sub rounded-md mr-2 flex items-center justify-center text-white font-bold text-xs">
          A
        </div>
        <span className="font-bold text-white tracking-tight">진단 자동화 플랫폼</span>
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
                      onClick={() => setSelectedProject(project)}
                      className={`w-full text-left px-2 py-2 rounded-md flex items-center text-sm transition-colors ${
                        selectedProject.id === project.id 
                          ? 'bg-white/10 text-white font-medium' 
                          : 'hover:bg-white/5 text-gray-400'
                      }`}
                    >
                      <Hash size={16} className="mr-2 opacity-70" />
                      <span className="truncate">{project.name}</span>
                    </button>

                    {/* Middle Menus (Only shown for selected project) */}
                    {selectedProject.id === project.id && (
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
      </div>

      {/* User Profile */}
      <div className="p-4 bg-black/20 flex items-center">
        <img 
          src="https://picsum.photos/seed/me/32/32" 
          alt="My Profile" 
          className="w-8 h-8 rounded-full bg-gray-500 mr-2"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">이영희 대리</div>
          <div className="text-xs text-gray-400 truncate">온라인</div>
        </div>
        <Settings size={16} className="text-gray-400 hover:text-white cursor-pointer" />
      </div>
    </div>
  );
};

const MainContent = ({ 
  selectedProject, 
  selectedMenuData,
  activeTab,
  setActiveTab
}: { 
  selectedProject: Project;
  selectedMenuData: MiddleMenu;
  activeTab: 'chat' | 'automation';
  setActiveTab: (t: 'chat' | 'automation') => void;
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
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
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex justify-center my-4">
                <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                  오늘
                </span>
              </div>
              
              {MOCK_MESSAGES.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                  {!msg.isMe && (
                    <img 
                      src={msg.avatar} 
                      alt={msg.user} 
                      className="w-9 h-9 rounded-full mr-3 mt-1 shadow-sm"
                    />
                  )}
                  <div className={`max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!msg.isMe && (
                      <div className="flex items-baseline mb-1">
                        <span className="font-semibold text-sm text-gray-900 mr-2">{msg.user}</span>
                        <span className="text-xs text-gray-400">{msg.time}</span>
                      </div>
                    )}
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.isMe 
                          ? 'bg-brand-main text-white rounded-tr-none' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                    {msg.isMe && <span className="text-xs text-gray-400 mt-1 mr-1">{msg.time}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-brand-sub/30 focus-within:border-brand-sub transition-all shadow-sm">
                <textarea 
                  placeholder={`#${selectedMenuData.name}에 메시지 보내기`}
                  className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm min-h-[40px] max-h-[120px] px-2 py-1"
                  rows={1}
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex space-x-2">
                    <button className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-md transition-colors">
                      <Paperclip size={18} />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:bg-gray-200 rounded-md transition-colors">
                      <ImageIcon size={18} />
                    </button>
                  </div>
                  <button className="bg-brand-main hover:bg-brand-main/90 text-white p-2 rounded-lg transition-colors shadow-sm flex items-center justify-center">
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

export default function App() {
  const [selectedProject, setSelectedProject] = useState<Project>(PROJECTS[0]);
  const [selectedMenuId, setSelectedMenuId] = useState<MiddleMenuId>('field_data');
  const [activeTab, setActiveTab] = useState<'chat' | 'automation'>('chat');

  const selectedMenuData = MIDDLE_MENUS.find(m => m.id === selectedMenuId) || MIDDLE_MENUS[0];

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans bg-brand-light">
      <Sidebar 
        selectedProject={selectedProject} 
        setSelectedProject={setSelectedProject}
        selectedMenu={selectedMenuId}
        setSelectedMenu={setSelectedMenuId}
      />
      <MainContent 
        selectedProject={selectedProject}
        selectedMenuData={selectedMenuData}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <RightPanel selectedMenuData={selectedMenuData} />
    </div>
  );
}
