// components/board/EntryDetailPage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import type { Entry } from '../../types/entry';
import { deleteEntry, subscribeEntryById } from '../../lib/firebaseEntries';
import { markEntryCommentsRead } from '../../lib/firebaseComments';
import { CATEGORY_LABEL, COMPANY_LABEL, DEV_STATUS_LABEL } from '../../config/boardOptions';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  HelpText,
  LinkButton,
  Row,
  SubTitle,
  Title,
  ErrorText,
} from '../ui/Controls';
import { SkeletonBlock } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import EntryForm from './EntryForm';
import CommentsSection from './CommentsSection';
import { formatKoreanDateTime, formatKoreanDateTimeRange } from '@/lib/utils/data';
import { useAuth } from '@/lib/auth/AuthProvider';

const Content = styled.div`
  white-space: pre-wrap;
  line-height: 1.7;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

export default function EntryDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const unsub = subscribeEntryById(
      id,
      (data) => {
        setEntry(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  // ✅ 글 작성자가 글 상세를 열면: 해당 글 댓글을 읽음 처리
  useEffect(() => {
    if (!user || !entry) return;
    if (user.uid !== entry.authorUid) return;

    markEntryCommentsRead(entry.id, user.uid).catch((e) => console.error(e));
  }, [user?.uid, entry?.id]);

  const isMine = !!(user && entry && user.uid === entry.authorUid);

  const headerChips = useMemo(() => {
    if (!entry) return null;

    const chips: Array<{ label: string; tone?: 'primary' | 'warning' | 'success' | 'neutral' }> = [];

    chips.push({
      label: CATEGORY_LABEL[entry.category],
      tone: entry.category === 'DEV' ? 'primary' : entry.category === 'FEEDBACK' ? 'warning' : 'neutral',
    });
    chips.push({ label: entry.process });
    chips.push({ label: entry.detail });

    if (entry.category === 'DEV' && entry.devStatus) {
      const lbl = DEV_STATUS_LABEL[entry.devStatus];
      chips.push({
        label: lbl,
        tone: entry.devStatus === 'DONE' ? 'success' : entry.devStatus === 'IN_PROGRESS' ? 'primary' : 'neutral',
      });
    }

    return chips;
  }, [entry]);

  async function confirmDelete() {
    if (!entry) return;

    if (!user) {
      auth.openLogin({ redirectTo: `/posts/${entry.id}` });
      return;
    }
    if (user.uid !== entry.authorUid) {
      setDeleteErr('작성자만 삭제할 수 있어요.');
      return;
    }

    setDeleteBusy(true);
    setDeleteErr(null);

    try {
      await deleteEntry(entry.id);
      setDeleteOpen(false);
      router.push('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '삭제 실패';
      setDeleteErr(msg);
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return (
      <Card aria-label="상세 로딩 중">
        <CardHeader>
          <div style={{ width: '100%' }}>
            <SkeletonBlock $h={30} $w="320px" />
            <div style={{ height: 12 }} />
            <SkeletonBlock $h={18} $w="70%" />
          </div>
        </CardHeader>
        <CardBody>
          <SkeletonBlock $h={18} $w="92%" />
          <div style={{ height: 10 }} />
          <SkeletonBlock $h={18} $w="96%" />
          <div style={{ height: 10 }} />
          <SkeletonBlock $h={18} $w="84%" />
        </CardBody>
      </Card>
    );
  }

  if (err) {
    return (
      <EmptyState
        title="상세 정보를 불러오지 못했어요"
        description={`에러: ${err}`}
        actionLabel="목록으로"
        onAction={() => router.push('/')}
      />
    );
  }

  if (!entry) {
    return (
      <EmptyState
        title="글을 찾을 수 없어요"
        description="삭제되었거나 존재하지 않는 글입니다."
        actionLabel="목록으로"
        onAction={() => router.push('/')}
      />
    );
  }

  if (editMode) {
    return (
      <>
        <EntryForm mode="edit" entryId={entry.id} initial={entry} onDone={() => setEditMode(false)} />
        <div style={{ height: 12 }} />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button type="button" $variant="ghost" onClick={() => setEditMode(false)}>
            수정 취소(상세로)
          </Button>
        </Row>
      </>
    );
  }

  return (
    <>
      <Card aria-label="글 상세">
        <CardHeader>
          <div>
            <Title>{entry.title}</Title>
            <SubTitle>
              {COMPANY_LABEL[entry.company]} · {entry.authorName} · 작성 {entry.createdAt ? formatKoreanDateTime(entry.createdAt) : '—'}
              {entry.updatedAt ? ` · 수정 ${formatKoreanDateTime(entry.updatedAt)}` : ''}
            </SubTitle>

            <Row style={{ marginTop: 12 }}>
              {headerChips?.map((c, idx) => (
                <Chip key={idx} $tone={c.tone}>
                  {c.label}
                </Chip>
              ))}
            </Row>
          </div>

          <Row>
            <LinkButton href="/" $variant="ghost">
              목록
            </LinkButton>

            {isMine ? (
              <>
                <Button type="button" $variant="ghost" onClick={() => setEditMode(true)}>
                  수정
                </Button>
                <Button type="button" $variant="danger" onClick={() => setDeleteOpen(true)}>
                  삭제
                </Button>
              </>
            ) : null}
          </Row>
        </CardHeader>

        <CardBody>
          {entry.category === 'DEV' && (
            <>
              <Row>
                <Chip $tone="primary">개발예정시간</Chip>
                <HelpText>{formatKoreanDateTimeRange(entry.plannedStartAt, entry.plannedEndAt)}</HelpText>
              </Row>
              <Divider />
            </>
          )}

          <Content aria-label="내용">{entry.content}</Content>
        </CardBody>
      </Card>

      <div style={{ height: 16 }} />

      <CommentsSection entryId={entry.id} entryTitle={entry.title} entryAuthorUid={entry.authorUid} />

      <Modal
        open={deleteOpen}
        title="글 삭제"
        description="삭제는 되돌릴 수 없습니다. 정말 삭제하시겠어요?"
        onClose={() => {
          setDeleteOpen(false);
          setDeleteErr(null);
        }}
        footer={
          <>
            <Button type="button" $variant="ghost" onClick={() => setDeleteOpen(false)}>
              취소
            </Button>
            <Button type="button" $variant="danger" onClick={confirmDelete} disabled={deleteBusy}>
              {deleteBusy ? '삭제 중…' : '삭제'}
            </Button>
          </>
        }
      >
        {deleteErr ? <ErrorText>{deleteErr}</ErrorText> : null}
      </Modal>
    </>
  );
}