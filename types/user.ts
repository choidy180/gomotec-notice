// types/user.ts
import type { Timestamp } from 'firebase/firestore';
import type { Company } from './entry';

export interface UserProfileDoc {
  company: Company;
  name: string;
  phoneNormalized: string;
  photoURL: string | null;

  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserProfile extends UserProfileDoc {
  uid: string;
}

export interface UserNameIndexDoc {
  uid: string;
  company: Company;
  name: string;
  email: string;
  createdAt: Timestamp | null;
}