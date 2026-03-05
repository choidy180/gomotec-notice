// components/board/CommentsSection.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { SkeletonBlock } from '../ui/Skeleton';
import { Button, ErrorText, Row } from '../ui/Controls';
import type { Comment } from '../../types/comment';
import { createComment, deleteComment, subscribeComments, updateComment } from '../../lib/firebaseComments';
import { useAuth } from '@/lib/auth/AuthProvider';

// --- Styled Components (High Density & Boxed Items) ---

const SectionContainer = styled.section`
  background: #FFFFFF;
  border: 1px solid #E5E8EB;
  border-radius: 12px;
  /* 컨테이너 내부 여백을 24px -> 20px로 축소 */
  padding: 20px; 
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px; /* 헤더 여백 축소 */
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem; /* 사이즈 살짝 축소하여 밀도 확보 */
  font-weight: 700;
  color: #191F28;
  margin: 0;
`;

const CountBadge = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #3182F6; 
`;

const List = styled.ul`
  list-style: none;
  padding: 0 0 16px;
  margin: 0;
  display: grid;
  gap: 10px; /* 댓글 간 간격을 10px로 타이트하게 조절 */
`;

const Item = styled.li`
  display: grid;
  grid-template-columns: 36px 1fr; /* 아바타 크기에 맞춰 그리드 축소 */
  gap: 12px;
  /* 박스 형태로 명확히 구분되도록 배경색과 테두리 적용 */
  padding: 14px 16px;
  background: #F9FAFB; 
  border: 1px solid #F2F4F6; 
  border-radius: 12px;
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 6px;
`;

const Name = styled.span`
  font-weight: 600;
  font-size: 0.875rem; /* 이름 폰트 축소 */
  color: #191F28;
`;

const Time = styled.span`
  font-weight: 500;
  font-size: 0.75rem; /* 시간 폰트 축소 */
  color: #8B95A1;
`;

const Content = styled.div<{ $expanded?: boolean }>`
  font-size: 0.9375rem;
  line-height: 1.5;
  color: #333D4B;
  white-space: pre-wrap;
  word-break: break-word;

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 3; /* 타이트한 박스를 위해 접힌 글줄 제한 축소 */
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ActionRow = styled(Row)`
  margin-top: 6px; /* 여백 축소 */
  justify-content: space-between;
`;

const ActionButton = styled.button`
  background: transparent;
  border: none;
  color: #8B95A1;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px; 
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #E5E8EB; /* 회색 배경 호버 시 조금 더 진하게 */
    color: #4E5968;
  }
`;

const ActionButtonDanger = styled(ActionButton)`
  &:hover {
    color: #F04452;
  }
`;

// --- Composer Area ---

const ComposerWrap = styled.div`
  position: sticky;
  bottom: 0;
  background: #FFFFFF;
  padding-top: 12px; /* 상단 여백 축소 */
  border-top: 1px solid #E5E8EB;
`;

const EmojiRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 10px; /* 이모지 여백 축소 */
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const EmojiBtn = styled.button`
  background: #F9FAFB;
  border: 1px solid #E5E8EB;
  border-radius: 16px; 
  padding: 4px 10px; /* 이모지 버튼 크기 축소 */
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #F2F4F6;
  }
`;

const Composer = styled.div`
  display: grid;
  grid-template-columns: 32px 1fr auto; /* 입력창 아바타 축소 */
  gap: 10px;
  align-items: end; 
`;

const InputLike = styled.textarea`
  width: 100%;
  min-height: 40px; /* 입력창 높이 더 축소 */
  border: 1px solid #E5E8EB;
  outline: none;
  resize: none;
  padding: 10px 12px;
  border-radius: 10px;
  background: #FFFFFF; /* 댓글 박스와 구분을 위해 흰색 유지 */
  font-size: 0.9375rem;
  line-height: 1.4;
  color: #191F28;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: #B0B8C1;
  }

  &:focus {
    border-color: #3182F6;
  }
`;

const SendBtn = styled.button`
  width: 40px; /* 버튼 크기 축소 */
  height: 40px;
  border-radius: 10px;
  border: 0;
  cursor: pointer;
  background: #3182F6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover:not(:disabled) {
    background: #1B64DA;
  }

  &:disabled {
    background: #D1D6DB;
    cursor: not-allowed;
  }
`;

const EditTextArea = styled.textarea`
  width: 100%;
  min-height: 100px; /* 높이 약간 축소 */
  border: 1px solid #E5E8EB;
  border-radius: 10px;
  padding: 12px;
  font-size: 0.9375rem;
  line-height: 1.5;
  font-family: inherit;
  outline: none;
  resize: vertical;
  
  &:focus {
    border-color: #3182F6;
  }
`;

// --- Component ---
// (동작 로직은 기존과 완전히 동일합니다)

type ModalState =
  | { type: 'EDIT'; comment: Comment }
  | { type: 'DELETE'; comment: Comment }
  | null;

function relTime(date: Date) {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return '방금 전';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
}

export default function CommentsSection({
  entryId,
  entryTitle,
  entryAuthorUid,
}: {
  entryId: string;
  entryTitle: string;
  entryAuthorUid: string;
}) {
  const auth = useAuth();
  const user = auth.user;
  const profile = auth.profile;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [modal, setModal] = useState<ModalState>(null);
  const [modalText, setModalText] = useState('');
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [modalBusy, setModalBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const unsub = subscribeComments(
      entryId,
      { max: 300 },
      (data) => {
        setComments(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setErr(e.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [entryId]);

  async function submit() {
    if (!user || !profile) {
      auth.openLogin({ redirectTo: `/posts/${entryId}` });
      return;
    }

    const content = text.trim();
    if (!content) return;

    setSending(true);
    try {
      await createComment(entryId, {
        entryTitle,
        entryAuthorUid,
        authorUid: user.uid,
        authorName: profile.name,
        company: profile.company,
        authorPhotoURL: profile.photoURL,
        content,
      });
      setText('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '댓글 등록 실패');
    } finally {
      setSending(false);
    }
  }

  const emojis = useMemo(() => ['📈', '❤️', '👍', '🙏', '🙂', '😢'], []);

  async function confirmModal() {
    if (!modal) return;

    if (!user) {
      auth.openLogin({ redirectTo: `/posts/${entryId}` });
      return;
    }

    const isMine = modal.comment.authorUid === user.uid;
    if (!isMine) {
      setModalErr('작성자만 수정/삭제할 수 있어요.');
      return;
    }

    setModalBusy(true);
    setModalErr(null);

    try {
      if (modal.type === 'EDIT') {
        const next = modalText.trim();
        if (!next) {
          setModalErr('내용을 입력해 주세요.');
          return;
        }
        await updateComment(entryId, modal.comment.id, { content: next });
      } else {
        await deleteComment(entryId, modal.comment.id);
      }
      setModal(null);
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : '처리 실패');
    } finally {
      setModalBusy(false);
    }
  }

  const SendIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>
  );

  return (
    <SectionContainer aria-label="댓글 영역">
      <SectionHeader>
        <SectionTitle>댓글</SectionTitle>
        <CountBadge>{comments.length}</CountBadge>
      </SectionHeader>

      {loading ? (
        <div aria-label="댓글 로딩 중">
          <SkeletonBlock $h={18} $w="200px" style={{ marginBottom: 8 }} />
          <SkeletonBlock $h={16} $w="80%" style={{ marginBottom: 6 }} />
          <SkeletonBlock $h={16} $w="60%" />
        </div>
      ) : err ? (
        <EmptyState
          title="댓글을 불러오지 못했어요"
          description={`에러: ${err}`}
          actionLabel="새로고침"
          onAction={() => window.location.reload()}
        />
      ) : comments.length === 0 ? (
        <EmptyState title="아직 댓글이 없어요" description="첫 댓글을 남겨보세요." />
      ) : (
        <List aria-label="댓글 목록">
          {comments.map((c) => {
            const ts = c.createdAt?.toDate?.() ?? null;
            const timeLabel = ts ? relTime(ts) : '기록중…';
            const canToggle = c.content.length > 160 || c.content.includes('\n');
            const isExpanded = !!expanded[c.id];
            const isMine = !!user && user.uid === c.authorUid;

            return (
              <Item key={c.id}>
                <Avatar size={36} name={c.authorName} seed={c.authorUid} photoURL={c.authorPhotoURL} />

                <div>
                  <Meta>
                    <Name>{c.authorName}</Name>
                    <Time>{timeLabel}</Time>
                    {c.updatedAt && <Time>(수정됨)</Time>}
                  </Meta>

                  <Content $expanded={isExpanded}>{c.content}</Content>

                  <ActionRow>
                    <div>
                      {canToggle && (
                        <ActionButton type="button" onClick={() => setExpanded((p) => ({ ...p, [c.id]: !isExpanded }))}>
                          {isExpanded ? '접기' : '더보기'}
                        </ActionButton>
                      )}
                    </div>

                    {isMine && (
                      <Row style={{ gap: 4 }}>
                        <ActionButton
                          type="button"
                          onClick={() => {
                            setModal({ type: 'EDIT', comment: c });
                            setModalText(c.content);
                            setModalErr(null);
                            setModalBusy(false);
                          }}
                        >
                          수정
                        </ActionButton>
                        <ActionButtonDanger
                          type="button"
                          onClick={() => {
                            setModal({ type: 'DELETE', comment: c });
                            setModalText('');
                            setModalErr(null);
                            setModalBusy(false);
                          }}
                        >
                          삭제
                        </ActionButtonDanger>
                      </Row>
                    )}
                  </ActionRow>
                </div>
              </Item>
            );
          })}
        </List>
      )}

      <ComposerWrap aria-label="댓글 작성 바">
        <EmojiRow aria-label="이모지 빠른 입력">
          {emojis.map((e) => (
            <EmojiBtn
              key={e}
              type="button"
              onClick={() => {
                if (!user) {
                  auth.openLogin({ redirectTo: `/posts/${entryId}` });
                  return;
                }
                setText((p) => (p ? `${p} ${e}` : e));
              }}
              aria-label={`이모지 추가 ${e}`}
            >
              {e}
            </EmojiBtn>
          ))}
        </EmojiRow>

        <Composer>
          {user && profile ? (
            <Avatar size={32} name={profile.name} seed={user.uid} photoURL={profile.photoURL} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F2F4F6' }} />
          )}

          <InputLike
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? '댓글을 남겨보세요' : '로그인 후 작성 가능'}
            aria-label="댓글 입력"
            onFocus={() => {
              if (!user) auth.openLogin({ redirectTo: `/posts/${entryId}` });
            }}
          />

          <SendBtn type="button" onClick={submit} disabled={sending || !text.trim()} aria-label="댓글 등록">
            <SendIcon />
          </SendBtn>
        </Composer>
      </ComposerWrap>

      <Modal
        open={!!modal}
        title={modal?.type === 'EDIT' ? '댓글 수정' : '댓글 삭제'}
        description={
          modal?.type === 'EDIT' ? '' : '댓글을 삭제합니다. 삭제는 되돌릴 수 없습니다.'
        }
        onClose={() => setModal(null)}
        footer={
          <>
            <Button type="button" $variant="ghost" onClick={() => setModal(null)}>
              취소
            </Button>
            <Button
              type="button"
              $variant={modal?.type === 'DELETE' ? 'danger' : 'primary'}
              onClick={confirmModal}
              disabled={modalBusy}
            >
              {modalBusy ? '처리 중…' : modal?.type === 'DELETE' ? '삭제하기' : '수정 완료'}
            </Button>
          </>
        }
      >
        {modal?.type === 'EDIT' && (
          <EditTextArea
            value={modalText}
            onChange={(e) => setModalText(e.target.value)}
            aria-label="댓글 수정 내용"
          />
        )}
        {modalErr && <ErrorText style={{ marginTop: 12 }}>{modalErr}</ErrorText>}
      </Modal>
    </SectionContainer>
  );
}