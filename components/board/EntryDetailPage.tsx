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
  Chip,
  HelpText,
  Row,
  ErrorText,
} from '../ui/Controls';
import { SkeletonBlock } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import EntryForm from './EntryForm';
import CommentsSection from './CommentsSection';
import { formatKoreanDateTime, formatKoreanDateTimeRange } from '@/lib/utils/data';
import { useAuth } from '@/lib/auth/AuthProvider';

// --- Styled Components (High Density Toss Style) ---

const PageWrapper = styled.div`
  max-width: 1300px; /* 요청하신 1300px 적용 */
  margin: 0 auto;
  box-sizing: border-box;
`;

const TopActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px; /* 상단 액션바와 본문 사이 여백 축소 */
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: #4E5968; /* 조금 더 선명한 색상으로 가독성 확보 */
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px 4px 0;
  transition: color 0.2s ease;

  &:hover {
    color: #191F28;
  }
`;

const ArticleContainer = styled.article`
  background: #FFFFFF;
  border: 1px solid #E5E8EB;
  border-radius: 12px; /* 곡률을 줄여 단정한 느낌 */
  padding: 24px; /* 내부 여백 대폭 축소 (기존 40px -> 24px) */
`;

const HeaderSection = styled.header`
  margin-bottom: 16px; /* 헤더와 본문 간격 축소 */
`;

const TitleText = styled.h1`
  font-size: 1.5rem; /* 제목 크기를 약간 줄여 밀도 향상 */
  font-weight: 700;
  color: #191F28;
  margin: 0 0 10px 0;
  line-height: 1.3;
  letter-spacing: -0.01em;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  color: #8B95A1;
  font-size: 0.875rem; /* 메타데이터 크기 축소 */
  font-weight: 500;
  margin-bottom: 12px;

  span {
    display: inline-flex;
    align-items: center;
  }

  span:not(:last-child)::after {
    content: '';
    display: inline-block;
    width: 3px;
    height: 3px;
    background-color: #D1D6DB;
    border-radius: 50%;
    margin-left: 10px;
  }
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background-color: #E5E8EB;
  margin: 16px 0; /* 구분선 위아래 여백 대폭 축소 */
`;

const ContentText = styled.div`
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 1rem;
  color: #333D4B;
  word-break: break-word;
`;

const DevInfoBox = styled.div`
  background-color: #F9FAFB;
  border-radius: 8px; /* 박스 곡률 축소 */
  padding: 12px 16px; /* 내부 여백 축소 */
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
`;

// --- Component ---

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
      setDeleteErr(e instanceof Error ? e.message : '삭제 실패');
    } finally {
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <ArticleContainer aria-label="상세 로딩 중">
          <SkeletonBlock $h={28} $w="50%" style={{ marginBottom: 12 }} />
          <SkeletonBlock $h={18} $w="30%" style={{ marginBottom: 16 }} />
          <Divider />
          <SkeletonBlock $h={16} $w="100%" style={{ marginBottom: 8 }} />
          <SkeletonBlock $h={16} $w="80%" style={{ marginBottom: 8 }} />
          <SkeletonBlock $h={16} $w="90%" />
        </ArticleContainer>
      </PageWrapper>
    );
  }

  if (err) {
    return (
      <PageWrapper>
        <EmptyState
          title="상세 정보를 불러오지 못했어요"
          description={`에러: ${err}`}
          actionLabel="목록으로 돌아가기"
          onAction={() => router.push('/')}
        />
      </PageWrapper>
    );
  }

  if (!entry) {
    return (
      <PageWrapper>
        <EmptyState
          title="글을 찾을 수 없어요"
          description="삭제되었거나 존재하지 않는 글입니다."
          actionLabel="목록으로 돌아가기"
          onAction={() => router.push('/')}
        />
      </PageWrapper>
    );
  }

  if (editMode) {
    return (
      <PageWrapper>
        <EntryForm mode="edit" entryId={entry.id} initial={entry} onDone={() => setEditMode(false)} />
        <div style={{ height: 12 }} />
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button type="button" $variant="ghost" onClick={() => setEditMode(false)}>
            수정 취소
          </Button>
        </Row>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <TopActions>
        <BackButton onClick={() => router.push('/')} aria-label="목록으로 이동">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          목록으로
        </BackButton>

        {isMine && (
          <Row style={{ gap: '4px' }}>
            <Button type="button" $variant="ghost" onClick={() => setEditMode(true)} style={{ color: '#4E5968', padding: '6px 12px', fontSize: '0.875rem' }}>
              수정
            </Button>
            <Button type="button" $variant="ghost" onClick={() => setDeleteOpen(true)} style={{ color: '#F04452', padding: '6px 12px', fontSize: '0.875rem' }}>
              삭제
            </Button>
          </Row>
        )}
      </TopActions>

      <ArticleContainer aria-label="글 상세">
        <HeaderSection>
          <TitleText>{entry.title}</TitleText>
          <MetaRow>
            <span>{COMPANY_LABEL[entry.company]} · {entry.authorName}</span>
            <span>작성 {entry.createdAt ? formatKoreanDateTime(entry.createdAt) : '—'}</span>
            {entry.updatedAt && (
              <span>수정 {formatKoreanDateTime(entry.updatedAt)}</span>
            )}
          </MetaRow>

          <ChipRow>
            {headerChips?.map((c, idx) => (
              <Chip key={idx} $tone={c.tone}>{c.label}</Chip>
            ))}
          </ChipRow>
        </HeaderSection>

        <Divider />

        {entry.category === 'DEV' && entry.plannedStartAt && entry.plannedEndAt && (
          <DevInfoBox>
            <Chip $tone="primary">개발예정</Chip>
            <HelpText style={{ margin: 0, fontWeight: 500, color: '#4E5968', fontSize: '0.875rem' }}>
              {formatKoreanDateTimeRange(entry.plannedStartAt, entry.plannedEndAt)}
            </HelpText>
          </DevInfoBox>
        )}

        <ContentText aria-label="내용">{entry.content}</ContentText>
      </ArticleContainer>

      <div style={{ height: '24px' }} />

      {/* 댓글 섹션 */}
      <CommentsSection entryId={entry.id} entryTitle={entry.title} entryAuthorUid={entry.authorUid} />

      {/* 삭제 모달 */}
      <Modal
        open={deleteOpen}
        title="글을 삭제하시겠어요?"
        description="삭제한 글은 다시 복구할 수 없습니다."
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
              {deleteBusy ? '삭제 중…' : '삭제하기'}
            </Button>
          </>
        }
      >
        {deleteErr && <ErrorText>{deleteErr}</ErrorText>}
      </Modal>
    </PageWrapper>
  );
}