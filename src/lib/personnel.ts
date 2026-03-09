import { getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getPersonnelRecordRef } from './firestore-paths';
import type {
  PersonnelRecord,
  PersonnelBasicInfo,
  PersonnelRecruitmentInfo,
  PersonnelCareerEntry,
  PersonnelEducationCert,
  PersonnelPerformanceEntry,
  PersonnelResignationInfo,
} from '../types/personnel';
import {
  EMPTY_BASIC_INFO,
  EMPTY_RECRUITMENT_INFO,
  EMPTY_RESIGNATION_INFO,
} from '../types/personnel';

/** Firestore 문서 → PersonnelRecord. userId는 문서 ID. */
function docToRecord(userId: string, data: Record<string, unknown>): PersonnelRecord {
  const basic = (data.basicInfo as Record<string, unknown>) ?? {};
  const recruitment = (data.recruitmentInfo as Record<string, unknown>) ?? {};
  const resignation = (data.resignationInfo as Record<string, unknown>) ?? {};
  return {
    userId,
    basicInfo: {
      name: (basic.name as string) ?? '',
      nameEn: (basic.nameEn as string) ?? '',
      residentNumber: (basic.residentNumber as string) ?? '',
      phone: (basic.phone as string) ?? '',
      address: (basic.address as string) ?? '',
      email: (basic.email as string) ?? '',
    },
    recruitmentInfo: {
      hireDate: (recruitment.hireDate as string) ?? '',
      channel: (recruitment.channel as string) ?? '',
      initialDepartment: (recruitment.initialDepartment as string) ?? '',
      initialPosition: (recruitment.initialPosition as string) ?? '',
      competencyNotes: (recruitment.competencyNotes as string) ?? '',
      interviewNotes: (recruitment.interviewNotes as string) ?? '',
    },
    careerHistory: Array.isArray(data.careerHistory)
      ? (data.careerHistory as PersonnelCareerEntry[])
      : [],
    educationCerts: Array.isArray(data.educationCerts)
      ? (data.educationCerts as PersonnelEducationCert[])
      : [],
    performanceRecords: Array.isArray(data.performanceRecords)
      ? (data.performanceRecords as PersonnelPerformanceEntry[])
      : [],
    resignationInfo: {
      resignDate: (resignation.resignDate as string) ?? '',
      reason: (resignation.reason as string) ?? '',
      procedure: (resignation.procedure as string) ?? '',
    },
    updatedAt: (data.updatedAt as number) ?? null,
    updatedBy: (data.updatedBy as string) ?? null,
  };
}

/** 빈 인사기록 (문서 없을 때 반환용). */
export function getEmptyPersonnelRecord(userId: string): PersonnelRecord {
  return {
    userId,
    basicInfo: { ...EMPTY_BASIC_INFO },
    recruitmentInfo: { ...EMPTY_RECRUITMENT_INFO },
    careerHistory: [],
    educationCerts: [],
    performanceRecords: [],
    resignationInfo: { ...EMPTY_RESIGNATION_INFO },
    updatedAt: null,
    updatedBy: null,
  };
}

/** 인사기록 1건 조회. 없으면 빈 레코드 반환. */
export async function getPersonnelRecord(userId: string): Promise<PersonnelRecord> {
  const ref = getPersonnelRecordRef(userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return getEmptyPersonnelRecord(userId);
  return docToRecord(snap.id, snap.data());
}

/** 인사기록 전체 저장 (덮어쓰기). 관리자 전용. */
export async function setPersonnelRecord(
  userId: string,
  record: PersonnelRecord,
  updatedBy: string
): Promise<void> {
  const ref = getPersonnelRecordRef(userId);
  const now = Date.now();
  await setDoc(ref, {
    basicInfo: record.basicInfo,
    recruitmentInfo: record.recruitmentInfo,
    careerHistory: record.careerHistory,
    educationCerts: record.educationCerts,
    performanceRecords: record.performanceRecords,
    resignationInfo: record.resignationInfo,
    updatedAt: now,
    updatedBy,
  });
}

/** 인사기록 일부 필드만 업데이트. */
export async function updatePersonnelRecord(
  userId: string,
  updates: Partial<{
    basicInfo: PersonnelBasicInfo;
    recruitmentInfo: PersonnelRecruitmentInfo;
    careerHistory: PersonnelCareerEntry[];
    educationCerts: PersonnelEducationCert[];
    performanceRecords: PersonnelPerformanceEntry[];
    resignationInfo: PersonnelResignationInfo;
  }>,
  updatedBy: string
): Promise<void> {
  const ref = getPersonnelRecordRef(userId);
  const now = Date.now();
  const payload: Record<string, unknown> = { updatedAt: now, updatedBy };
  if (updates.basicInfo != null) payload.basicInfo = updates.basicInfo;
  if (updates.recruitmentInfo != null) payload.recruitmentInfo = updates.recruitmentInfo;
  if (updates.careerHistory != null) payload.careerHistory = updates.careerHistory;
  if (updates.educationCerts != null) payload.educationCerts = updates.educationCerts;
  if (updates.performanceRecords != null) payload.performanceRecords = updates.performanceRecords;
  if (updates.resignationInfo != null) payload.resignationInfo = updates.resignationInfo;
  await updateDoc(ref, payload);
}
