/** 인사기록카드 1. 기본 정보 */
export interface PersonnelBasicInfo {
  name: string;
  nameEn: string;
  residentNumber: string;
  phone: string;
  address: string;
  email: string;
}

/** 인사기록카드 2. 채용 정보 */
export interface PersonnelRecruitmentInfo {
  hireDate: string;
  channel: string;
  initialDepartment: string;
  initialPosition: string;
  competencyNotes: string;
  interviewNotes: string;
}

/** 인사기록카드 3. 경력 및 직무 이동 */
export interface PersonnelCareerEntry {
  id: string;
  startDate: string;
  endDate: string;
  department: string;
  position: string;
  notes: string;
}

/** 인사기록카드 4. 교육 및 자격증 */
export interface PersonnelEducationCert {
  id: string;
  date: string;
  name: string;
  category: string;
  issuer: string;
  result: string;
  renewalDate: string;
}

/** 인사기록카드 5. 성과 평가 기록 */
export interface PersonnelPerformanceEntry {
  id: string;
  year: string;
  grade: string;
  promotion: string;
  award: string;
  discipline: string;
  notes: string;
}

/** 인사기록카드 6. 퇴직 정보 */
export interface PersonnelResignationInfo {
  resignDate: string;
  reason: string;
  procedure: string;
}

export interface PersonnelRecord {
  userId: string;
  basicInfo: PersonnelBasicInfo;
  recruitmentInfo: PersonnelRecruitmentInfo;
  careerHistory: PersonnelCareerEntry[];
  educationCerts: PersonnelEducationCert[];
  performanceRecords: PersonnelPerformanceEntry[];
  resignationInfo: PersonnelResignationInfo;
  updatedAt: number | null;
  updatedBy: string | null;
}

export const EMPTY_BASIC_INFO: PersonnelBasicInfo = {
  name: '',
  nameEn: '',
  residentNumber: '',
  phone: '',
  address: '',
  email: '',
};

export const EMPTY_RECRUITMENT_INFO: PersonnelRecruitmentInfo = {
  hireDate: '',
  channel: '',
  initialDepartment: '',
  initialPosition: '',
  competencyNotes: '',
  interviewNotes: '',
};

export const EMPTY_RESIGNATION_INFO: PersonnelResignationInfo = {
  resignDate: '',
  reason: '',
  procedure: '',
};
