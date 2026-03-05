// lib/firebaseUsers.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
  type WithFieldValue,
  type Timestamp,
} from 'firebase/firestore';

import { getDb } from './firebaseClient';
import type { Company } from '../types/entry';
import type { UserProfile } from '../types/user';

const COL_USERS = 'users';
const COL_LOGIN_INDEX = 'user_index_by_name';

export type LoginIndexDoc = {
  key: string; // `${company}__${nameNormalized}` (단일 where로도 찾을 수 있게)
  uid: string;
  company: Company;
  name: string;
  email: string;
  phoneNormalized: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

export type CreateUserProfileAndIndexParams = {
  uid: string;
  company: Company;
  name: string; // normalizeName 된 값이 들어오는 걸 권장
  phoneNormalized: string; // normalizePhone 된 값
  email: string;
};

function normalizeKey(s: string) {
  return String(s).trim().replace(/\s+/g, '');
}

/**
 * ✅ 로그인 인덱스 문서 ID 규칙 (중요)
 * - Firestore 문서 ID로 쓰기 때문에 '/' 같은 문자는 제거/치환
 */
export function makeLoginIndexDocId(company: Company, name: string) {
  const c = normalizeKey(company).replaceAll('/', '_');
  const n = normalizeKey(name).replaceAll('/', '_');
  return `${c}__${n}`;
}

/**
 * ✅ (회원가입 전) 같은 소속 내 이름 중복 확인
 * - user_index_by_name는 rules에서 read: true 여야 로그인/가입이 됨
 */
export async function assertNameAvailable(company: Company, name: string) {
  const db = getDb();
  const key = makeLoginIndexDocId(company, name);

  // 1) 문서ID 방식(인덱스 필요 없음)
  const ref = doc(db, COL_LOGIN_INDEX, key);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    throw new Error('같은 소속에서 이미 사용 중인 이름입니다.');
  }

  // 2) 혹시 예전 데이터가 docId가 랜덤인 형태였을 수 있으니 key 필드로도 체크(단일 where라 인덱스 필요 X)
  const q = query(collection(db, COL_LOGIN_INDEX), where('key', '==', key), limit(1));
  const qs = await getDocs(q);
  if (!qs.empty) {
    throw new Error('같은 소속에서 이미 사용 중인 이름입니다.');
  }
}

/**
 * ✅ 로그인 시: (company, name) → user_index_by_name에서 email 찾기
 */
export async function getLoginIndexByName(company: Company, name: string) {
  const db = getDb();
  const key = makeLoginIndexDocId(company, name);

  // 1) docId로 먼저 찾기
  const ref = doc(db, COL_LOGIN_INDEX, key);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...(snap.data() as LoginIndexDoc) };
  }

  // 2) key 필드로 찾기(예전 랜덤 docId 대비)
  const q = query(collection(db, COL_LOGIN_INDEX), where('key', '==', key), limit(1));
  const qs = await getDocs(q);
  if (!qs.empty) {
    const d = qs.docs[0];
    return { id: d.id, ...(d.data() as LoginIndexDoc) };
  }

  return null;
}

/**
 * ✅ 회원가입 후: users + user_index_by_name를 "원자적으로" 생성
 * - 둘 중 하나만 생기는 걸 방지(트랜잭션)
 */
export async function createUserProfileAndIndex(params: CreateUserProfileAndIndexParams) {
  const db = getDb();

  const key = makeLoginIndexDocId(params.company, params.name);
  const userRef = doc(db, COL_USERS, params.uid);
  const indexRef = doc(db, COL_LOGIN_INDEX, key);

  await runTransaction(db, async (tx) => {
    const indexSnap = await tx.get(indexRef);
    if (indexSnap.exists()) {
      throw new Error('이미 사용 중인 이름입니다. (인덱스 존재)');
    }

    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      throw new Error('이미 사용자 프로필이 존재합니다. (중복 가입)');
    }

    const userDoc: WithFieldValue<any> = {
      uid: params.uid,
      company: params.company,
      name: params.name,
      phoneNormalized: params.phoneNormalized,
      email: params.email,
      photoURL: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const indexDoc: WithFieldValue<LoginIndexDoc> = {
      key,
      uid: params.uid,
      company: params.company,
      name: params.name,
      email: params.email,
      phoneNormalized: params.phoneNormalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    tx.set(userRef, userDoc);
    tx.set(indexRef, indexDoc);
  });
}

/**
 * ✅ 내 프로필 구독 (MyPage 등에서 사용)
 */
export function subscribeMyProfile(
  uid: string,
  onData: (p: UserProfile | null) => void,
  onError: (e: Error) => void
): Unsubscribe {
  const db = getDb();
  const ref = doc(db, COL_USERS, uid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return onData(null);
      onData(snap.data() as UserProfile);
    },
    (err) => onError(err as Error)
  );
}

/**
 * ✅ 프로필 사진 업데이트
 */
export async function updateMyPhoto(uid: string, photoURL: string | null) {
  const db = getDb();
  const ref = doc(db, COL_USERS, uid);

  await setDoc(
    ref,
    {
      photoURL: photoURL ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}