import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { WithFieldValue, PartialWithFieldValue } from 'firebase/firestore';

import { getDb } from './firebaseClient';
import type { Comment, CommentDoc } from '../types/comment';
import { stripUndefined } from './utils/stripUndefined';

const ENTRIES = 'dev_board_entries';
const COMMENTS = 'comments';
const AUDIT = 'dev_board_audit_logs';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type CommentCreateInput = Omit<
  CommentDoc,
  'createdAt' | 'updatedAt' | 'readByEntryAuthorAt' | 'entryId'
>;

export type CommentUpdateInput = Partial<
  Omit<CommentDoc, 'createdAt' | 'authorUid' | 'entryId' | 'entryAuthorUid' | 'readByEntryAuthorAt'>
>;

function isValidPathSegment(s: unknown): s is string {
  return typeof s === 'string' && s.trim() !== '' && !s.includes('/');
}

function mapDoc(id: string, data: CommentDoc): Comment {
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

export function subscribeComments(
  entryId: string,
  params: { max?: number },
  onData: (comments: Comment[]) => void,
  onError: (e: Error) => void
) {
  if (!isValidPathSegment(entryId)) {
    onError(new Error('잘못된 entryId 입니다.'));
    onData([]);
    return () => {};
  }

  const db = getDb();
  const q = query(
    collection(db, ENTRIES, entryId, COMMENTS),
    orderBy('createdAt', 'desc'),
    limit(params.max ?? 300)
  );

  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs.map((d) => mapDoc(d.id, d.data() as CommentDoc));
      onData(comments);
    },
    (err) => onError(err as Error)
  );
}

export async function createComment(entryId: string, input: CommentCreateInput) {
  if (!isValidPathSegment(entryId)) throw new Error('잘못된 entryId 입니다.');

  const db = getDb();
  const commentRef = doc(collection(db, ENTRIES, entryId, COMMENTS));
  const auditRef = doc(collection(db, AUDIT));
  const client = getClientInfo();

  const isOwnerComment = input.authorUid === input.entryAuthorUid;

  // ✅ serverTimestamp()는 FieldValue → WithFieldValue<CommentDoc>로 타입 해결
  const payload: WithFieldValue<CommentDoc> = {
    ...input,
    entryId,
    readByEntryAuthorAt: isOwnerComment ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: null,
  };

  const audit = {
    targetType: 'COMMENT',
    action: 'CREATE' as AuditAction,
    entryId,
    commentId: commentRef.id,
    performedAt: serverTimestamp(),
    performedBy: { uid: input.authorUid, company: input.company, name: input.authorName },
    changedKeys: Object.keys(input).concat(['entryId', 'readByEntryAuthorAt']),
    before: null,
    after: payload,
    client,
  };

  const batch = writeBatch(db);
  batch.set(commentRef, payload);
  batch.set(auditRef, audit);
  await batch.commit();

  return commentRef.id;
}

export async function updateComment(entryId: string, commentId: string, patch: CommentUpdateInput) {
  if (!isValidPathSegment(entryId)) throw new Error('잘못된 entryId 입니다.');
  if (!isValidPathSegment(commentId)) throw new Error('잘못된 commentId 입니다.');

  const db = getDb();
  const ref = doc(db, ENTRIES, entryId, COMMENTS, commentId);
  const client = getClientInfo();

  const cleanedPatch = stripUndefined({ ...patch });

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('수정할 댓글이 존재하지 않습니다.');

    const beforeFull = snap.data() as CommentDoc;

    // ✅ update에도 serverTimestamp가 들어가므로 PartialWithFieldValue 사용
    const updateData = stripUndefined({
      ...cleanedPatch,
      updatedAt: serverTimestamp(),
    }) as PartialWithFieldValue<CommentDoc>;

    tx.update(ref, updateData);

    const afterFull = { ...(beforeFull as any), ...(updateData as any) };
    const changedKeys = Object.keys(updateData).filter((k) => k !== 'updatedAt');

    const auditRef = doc(collection(db, AUDIT));
    tx.set(auditRef, {
      targetType: 'COMMENT',
      action: 'UPDATE' as AuditAction,
      entryId,
      commentId,
      performedAt: serverTimestamp(),
      performedBy: { uid: beforeFull.authorUid, company: beforeFull.company, name: beforeFull.authorName },
      changedKeys,
      before: beforeFull,
      after: afterFull,
      client,
    });
  });
}

export async function deleteComment(entryId: string, commentId: string) {
  if (!isValidPathSegment(entryId)) throw new Error('잘못된 entryId 입니다.');
  if (!isValidPathSegment(commentId)) throw new Error('잘못된 commentId 입니다.');

  const db = getDb();
  const ref = doc(db, ENTRIES, entryId, COMMENTS, commentId);
  const client = getClientInfo();

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('삭제할 댓글이 존재하지 않습니다.');

    const beforeFull = snap.data() as CommentDoc;

    const auditRef = doc(collection(db, AUDIT));
    tx.set(auditRef, {
      targetType: 'COMMENT',
      action: 'DELETE' as AuditAction,
      entryId,
      commentId,
      performedAt: serverTimestamp(),
      performedBy: { uid: beforeFull.authorUid, company: beforeFull.company, name: beforeFull.authorName },
      changedKeys: [],
      before: beforeFull,
      after: null,
      client,
    });

    tx.delete(ref);
  });
}

/**
 * ✅ 글 작성자가 글 상세를 열었을 때: 안 읽은 댓글을 읽음 처리
 * - updatedAt은 건드리지 않음(“수정됨” 표시 방지)
 */
export async function markEntryCommentsRead(entryId: string, entryAuthorUid: string) {
  if (!isValidPathSegment(entryId)) throw new Error('잘못된 entryId 입니다.');

  const db = getDb();
  const q = query(
    collection(db, ENTRIES, entryId, COMMENTS),
    where('entryAuthorUid', '==', entryAuthorUid),
    where('readByEntryAuthorAt', '==', null),
    limit(450)
  );

  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { readByEntryAuthorAt: serverTimestamp() } as PartialWithFieldValue<CommentDoc>);
  });

  await batch.commit();
}

/** ✅ 마이페이지: 내 글에 달린 댓글 실시간 */
export function subscribeCommentsOnMyEntries(
  entryAuthorUid: string,
  params: { max?: number },
  onData: (comments: Comment[]) => void,
  onError: (e: Error) => void
) {
  const db = getDb();

  const q = query(
    collectionGroup(db, COMMENTS),
    where('entryAuthorUid', '==', entryAuthorUid),
    orderBy('createdAt', 'desc'),
    limit(params.max ?? 50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => mapDoc(d.id, d.data() as CommentDoc));
      onData(items);
    },
    (err) => onError(err as Error)
  );
}

/** ✅ 상단 알림(미읽음 개수) */
export function subscribeUnreadCommentCount(
  entryAuthorUid: string,
  onData: (count: number, capped: boolean) => void,
  onError: (e: Error) => void
) {
  const db = getDb();
  const MAX = 120;

  const q = query(
    collectionGroup(db, COMMENTS),
    where('entryAuthorUid', '==', entryAuthorUid),
    where('readByEntryAuthorAt', '==', null),
    limit(MAX)
  );

  return onSnapshot(
    q,
    (snap) => {
      const count = snap.size;
      const capped = count >= MAX;
      onData(count, capped);
    },
    (err) => onError(err as Error)
  );
}