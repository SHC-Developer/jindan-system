import {
  BarChart3,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  Settings,
} from 'lucide-react';
import type { MiddleMenu } from '../types/layout';

/** public 폴더 기준 로고 경로 (Vite base URL 적용) */
export const LOGO_URL = `${import.meta.env.BASE_URL}logo2.png`;

export const MIDDLE_MENUS: MiddleMenu[] = [
  { id: 'quantity-extract', name: '물량표 추출', icon: BarChart3 },
  { id: 'photo-album', name: '사진첩 자동', icon: ImageIcon },
  { id: 'report-review', name: '보고서 작성 도구 및 검토', icon: FileText },
  { id: 'field-survey', name: '현장조사 자료 데이터 정리', icon: CheckSquare },
  { id: 'material-test', name: '재료시험 작성 도구', icon: Settings },
];

/** 공지사항/일반채팅용 Firestore 경로 (projects/general-notice/subMenus/general-chat/messages) */
export const GENERAL_CHAT_PROJECT_ID = 'general-notice';
export const GENERAL_CHAT_SUBMENU_ID = 'general-chat';

/** CAD 채팅용 Firestore 경로 (projects/cad/subMenus/chat/messages) */
export const CAD_PROJECT_ID = 'cad';
export const CAD_SUBMENU_ID = 'chat';
