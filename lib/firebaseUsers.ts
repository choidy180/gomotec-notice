// lib/firebaseUsers.ts
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { getDb } from './firebaseClient';
import type { Company } from '../types/entry';
import type { UserNameIndexDoc, UserProfile, UserProfileDoc } from '../types/user';
import { buildNameIndexId } from './auth/identity';

const USERS = 'users';
const NAME_INDEX = 'user_index_by_name';

export async function getLoginIndexByName(company: Company, name: string) {
  const db = getDb();
  const id = buildNameIndexId(company, name);
  const snap = await getDoc(doc(db, NAME_INDEX, id));
  if (!snap.exists()) return null;
  return snap.data() as UserNameIndexDoc;
}

export async function assertNameAvailable(company: Company, name: string) {
  const idx = await getLoginIndexByName(company, name);
  if (idx) throw new Error('이미 사용 중인 이름입니다. (같은 소속 내 중복 불가)');
}

export async function createUserProfileAndIndex(params: {
  uid: string;
  company: Company;
  name: string;
  phoneNormalized: string;
  email: string;
}) {
  const db = getDb();

  const userRef = doc(db, USERS, params.uid);
  const idxRef = doc(db, NAME_INDEX, buildNameIndexId(params.company, params.name));

  const batch = writeBatch(db);

  const userPayload: UserProfileDoc = {
    company: params.company,
    name: params.name,
    phoneNormalized: params.phoneNormalized,
    photoURL: null,
    createdAt: null as any, // serverTimestamp로 대체
    updatedAt: null,
  };

  batch.set(userRef, {
    ...userPayload,
    createdAt: serverTimestamp(),
  });

  batch.set(idxRef, {
    uid: params.uid,
    company: params.company,
    name: params.name,
    email: params.email,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export function subscribeMyProfile(
  uid: string,
  onData: (p: UserProfile | null) => void,
  onError: (e: Error) => void
) {
  const db = getDb();
  const ref = doc(db, USERS, uid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ uid: snap.id, ...(snap.data() as UserProfileDoc) });
    },
    (err) => onError(err as Error)
  );
}

export async function updateMyPhoto(uid: string, photoURL: string | null) {
  const db = getDb();
  await updateDoc(doc(db, USERS, uid), {
    photoURL,
    updatedAt: serverTimestamp(),
  });
}