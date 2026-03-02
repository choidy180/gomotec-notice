// types/entry.ts
import type { Timestamp } from 'firebase/firestore';

export type Company = 'DX_SOLUTION' | 'GOMOTECH';

export type EntryCategory = 'DEV' | 'FEEDBACK' | 'REQUEST';
export type DevStatus = 'PLANNED' | 'IN_PROGRESS' | 'DONE';

export type SortKey = 'LATEST' | 'CATEGORY' | 'COMPANY';

export interface EntryDoc {
  category: EntryCategory;
  process: string;
  detail: string;

  devStatus: DevStatus | null;
  plannedStartAt: Timestamp | null;
  plannedEndAt: Timestamp | null;

  title: string;
  content: string;

  authorUid: string;
  authorName: string;
  company: Company;
  authorPhotoURL?: string | null;

  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Entry extends EntryDoc {
  id: string;
}