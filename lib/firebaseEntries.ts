// lib/firebaseEntries.ts
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from './firebaseClient';
import type { Entry, EntryDoc } from '../types/entry';
import { stripUndefined } from './utils/stripUndefined';

const COLLECTION_NAME = 'dev_board_entries';
const AUDIT_COLLECTION_NAME = 'dev_board_audit_logs';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type EntryCreateInput = Omit<EntryDoc, 'createdAt' | 'updatedAt'> & {
  createdAt?: never;
  updatedAt?: never;
};

export type EntryUpdateInput = Partial<Omit<EntryDoc, 'createdAt' | 'authorUid'>> & {
  createdAt?: never;
  authorUid?: never;
};

function isValidPathSegment(s: unknown): s is string {
  return typeof s === 'string' && s.trim() !== '' && !s.includes('/');
}

function mapDoc(id: string, data: EntryDoc): Entry {
  return { id, ...data };
}

function getClientInfo() {
  if (typeof navigator === 'undefined') return null;
  return {
    userAgent: navigator.userAgent ?? '',
    language: navigator.language ?? '',
    timezoneOffset: new Date().getTimezoneOffset(),
  };
}

export function subscribeEntries(
  params: { max?: number },
  onData: (entries: Entry[]) => void,
  onError: (e: Error) => void
) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('createdAt', 'desc'),
    limit(params.max ?? 1000)
  );

  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => mapDoc(d.id, d.data() as EntryDoc));
      onData(entries);
    },
    (err) => onError(err as Error)
  );
}

/** ✅ 마이페이지: 내가 쓴 글 */
export function subscribeEntriesByAuthorUid(
  authorUid: string,
  params: { max?: number },
  onData: (entries: Entry[]) => void,
  onError: (e: Error) => void
) {
  const db = getDb();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('authorUid', '==', authorUid),
    orderBy('createdAt', 'desc'),
    limit(params.max ?? 30)
  );

  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d) => mapDoc(d.id, d.data() as EntryDoc));
      onData(entries);
    },
    (err) => onError(err as Error)
  );
}

export function subscribeEntryById(
  id: string,
  onData: (entry: Entry | null) => void,
  onError: (e: Error) => void
) {
  if (!isValidPathSegment(id)) {
    onError(new Error('잘못된 글 ID 입니다.'));
    onData(null);
    return () => {};
  }

  const db = getDb();
  const ref = doc(db, COLLECTION_NAME, id);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(mapDoc(snap.id, snap.data() as EntryDoc));
    },
    (err) => onError(err as Error)
  );
}

export async function createEntry(input: EntryCreateInput) {
  const db = getDb();

  const entryRef = doc(collection(db, COLLECTION_NAME));
  const auditRef = doc(collection(db, AUDIT_COLLECTION_NAME));
  const client = getClientInfo();

  const payload = {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: null,
  };

  const audit = {
    targetType: 'ENTRY',
    action: 'CREATE' as AuditAction,
    entryId: entryRef.id,
    performedAt: serverTimestamp(),
    performedBy: { uid: input.authorUid, company: input.company, name: input.authorName },
    changedKeys: Object.keys(input),
    before: null,
    after: payload,
    client,
  };

  const batch = writeBatch(db);
  batch.set(entryRef, payload);
  batch.set(auditRef, audit);
  await batch.commit();

  return entryRef.id;
}

export async function updateEntry(id: string, patch: EntryUpdateInput) {
  if (!isValidPathSegment(id)) throw new Error('잘못된 글 ID 입니다.');

  const db = getDb();
  const entryRef = doc(db, COLLECTION_NAME, id);
  const client = getClientInfo();

  const cleanedPatch = stripUndefined({ ...patch });

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists()) throw new Error('수정할 글이 존재하지 않습니다.');

    const beforeFull = snap.data() as EntryDoc;

    const updateData = stripUndefined({
      ...cleanedPatch,
      updatedAt: serverTimestamp(),
    });

    tx.update(entryRef, updateData);

    const afterFull = { ...(beforeFull as any), ...(updateData as any) };
    const changedKeys = Object.keys(updateData).filter((k) => k !== 'updatedAt');

    const auditRef = doc(collection(db, AUDIT_COLLECTION_NAME));
    tx.set(auditRef, {
      targetType: 'ENTRY',
      action: 'UPDATE' as AuditAction,
      entryId: id,
      performedAt: serverTimestamp(),
      performedBy: { uid: beforeFull.authorUid, company: beforeFull.company, name: beforeFull.authorName },
      changedKeys,
      before: beforeFull,
      after: afterFull,
      client,
    });
  });
}

export async function deleteEntry(id: string) {
  if (!isValidPathSegment(id)) throw new Error('잘못된 글 ID 입니다.');

  const db = getDb();
  const entryRef = doc(db, COLLECTION_NAME, id);
  const client = getClientInfo();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(entryRef);
    if (!snap.exists()) throw new Error('삭제할 글이 존재하지 않습니다.');

    const beforeFull = snap.data() as EntryDoc;

    const auditRef = doc(collection(db, AUDIT_COLLECTION_NAME));
    tx.set(auditRef, {
      targetType: 'ENTRY',
      action: 'DELETE' as AuditAction,
      entryId: id,
      performedAt: serverTimestamp(),
      performedBy: { uid: beforeFull.authorUid, company: beforeFull.company, name: beforeFull.authorName },
      changedKeys: [],
      before: beforeFull,
      after: null,
      client,
    });

    tx.delete(entryRef);
  });
}