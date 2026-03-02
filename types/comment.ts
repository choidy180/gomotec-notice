// types/comment.ts
import type { Timestamp } from 'firebase/firestore';
import type { Company } from './entry';

export interface CommentDoc {
  // ✅ 알림/마이페이지용 메타
  entryId: string;
  entryTitle: string;
  entryAuthorUid: string;

  authorUid: string;
  authorName: string;
  company: Company;
  authorPhotoURL?: string | null;

  content: string;

  // ✅ 글 작성자가 댓글을 읽었는지(읽으면 timestamp)
  readByEntryAuthorAt: Timestamp | null;

  createdAt: Timestamp | null;
  updatedAt: Timestamp | null; // 댓글 내용 수정에만 사용(읽음 처리로는 건드리지 않음)
}

export interface Comment extends CommentDoc {
  id: string;
}