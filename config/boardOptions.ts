// config/boardOptions.ts
import type { Company, DevStatus, EntryCategory, SortKey } from '../types/entry';

export const DEFAULT_PAGE_SIZE = 10;
export const REALTIME_LIMIT = 1000;

export const CATEGORY_OPTIONS: Array<{ value: EntryCategory; label: string }> = [
  { value: 'DEV', label: '개발진행' },
  { value: 'FEEDBACK', label: '피드백' },
  { value: 'REQUEST', label: '추가 요청' },
];

export const CATEGORY_LABEL: Record<EntryCategory, string> = {
  DEV: '개발진행',
  FEEDBACK: '피드백',
  REQUEST: '추가 요청',
};

export const DEV_STATUS_OPTIONS: Array<{ value: DevStatus; label: string }> = [
  { value: 'PLANNED', label: '개발예정' },
  { value: 'IN_PROGRESS', label: '개발진행중' },
  { value: 'DONE', label: '개발완료' },
];

export const DEV_STATUS_LABEL: Record<DevStatus, string> = {
  PLANNED: '개발예정',
  IN_PROGRESS: '개발진행중',
  DONE: '개발완료',
};

export const COMPANY_OPTIONS: Array<{ value: Company; label: string }> = [
  { value: 'DX_SOLUTION', label: '디엑스솔루션' },
  { value: 'GOMOTECH', label: '고모텍' },
];

export const COMPANY_LABEL: Record<Company, string> = {
  DX_SOLUTION: '디엑스솔루션',
  GOMOTECH: '고모텍',
};

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'LATEST', label: '최신순' },
  { value: 'CATEGORY', label: '항목(개발/피드백/요청)' },
  { value: 'COMPANY', label: '소속' },
];

/** ✅ 실제 공정명(이미지와 동일) */
export const PROCESS_OPTIONS = [
  '자재관리',
  '공정품질',
  '공정설비',
  '생산관리',
  '작업관리',
  '출하관리',
] as const;

/** ✅ 실제 세부항목(사용자 제공 값 반영) */
export const PROCESS_DETAILS: Record<string, readonly string[]> = {
  자재관리: ['입고검수', '자재창고', '공정재고_GR5'],
  공정품질: ['유리틈새검사', '발포액누설 검사', '가스켓 이상 탐지', '필름부착확인'],
  공정설비: ['발포 품질 예측', '발포설비 예지보전'],
  생산관리: ['작업시간관리'],
  작업관리: ['Pysical AI'],
  출하관리: ['운송관리', '제품창고', '출하처리'],
};