// components/board/CommentsSection.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { SkeletonBlock } from '../ui/Skeleton';
import { Button, Card, CardBody, CardHeader, ErrorText, HelpText, Row, Title } from '../ui/Controls';
import type { Comment } from '../../types/comment';
import { createComment, deleteComment, subscribeComments, updateComment } from '../../lib/firebaseComments';
import { useAuth } from '@/lib/auth/AuthProvider';

const List = styled.ul`
  list-style: none;
  padding: 0 0 120px;
  margin: 16px 0 0;
  display: grid;
  gap: 16px;
`;

const Item = styled.li`
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const Name = styled.span`
  font-weight: 900;
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const Time = styled.span`
  font-weight: 800;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.muted};
`;

const Content = styled.div<{ $expanded?: boolean }>`
  margin-top: 10px;
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.7;
  white-space: pre-wrap;

  ${({ $expanded }) =>
    !$expanded &&
    css`
      display: -webkit-box;
      -webkit-line-clamp: 5;
      -webkit-box-orient: vertical;
      overflow: hidden;
    `}
`;

const ComposerWrap = styled.div`
  position: sticky;
  bottom: 12px;
  margin-top: 16px;
`;

const Composer = styled.div`
  display: grid;
  grid-template-columns: 48px 1fr 56px;
  gap: 10px;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const InputLike = styled.textarea`
  width: 100%;
  min-height: 48px;
  border: 0;
  outline: 0;
  resize: none;
  padding: 12px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface2};
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.4;
`;

const SendBtn = styled.button`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 0;
  cursor: pointer;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 900;
  font-size: ${({ theme }) => theme.fontSize.lg};

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

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
      const msg = e instanceof Error ? e.message : '댓글 등록 실패';
      setErr(msg);
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
      const msg = e instanceof Error ? e.message : '처리 실패';
      setModalErr(msg);
    } finally {
      setModalBusy(false);
    }
  }

  return (
    <Card aria-label="댓글">
      <CardHeader>
        <div>
          <Title>댓글</Title>
          <HelpText>{comments.length}개</HelpText>
        </div>
      </CardHeader>

      <CardBody>
        {loading ? (
          <div aria-label="댓글 로딩 중">
            <SkeletonBlock $h={18} $w="240px" />
            <div style={{ height: 10 }} />
            <SkeletonBlock $h={18} $w="88%" />
            <div style={{ height: 8 }} />
            <SkeletonBlock $h={18} $w="92%" />
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
                  <Avatar size={52} name={c.authorName} seed={c.authorUid} photoURL={c.authorPhotoURL} />

                  <div>
                    <Meta>
                      <Name>{c.authorName}</Name>
                      <Time>{timeLabel}</Time>
                      {c.updatedAt ? <Time>(수정됨)</Time> : null}
                    </Meta>

                    <Content $expanded={isExpanded}>{c.content}</Content>

                    <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
                      <Row>
                        {canToggle ? (
                          <Button
                            type="button"
                            $variant="ghost"
                            onClick={() => setExpanded((p) => ({ ...p, [c.id]: !isExpanded }))}
                          >
                            {isExpanded ? '접기' : '더보기'}
                          </Button>
                        ) : null}
                      </Row>

                      {isMine ? (
                        <Row>
                          <Button
                            type="button"
                            $variant="ghost"
                            onClick={() => {
                              setModal({ type: 'EDIT', comment: c });
                              setModalText(c.content);
                              setModalErr(null);
                              setModalBusy(false);
                            }}
                          >
                            수정
                          </Button>
                          <Button
                            type="button"
                            $variant="danger"
                            onClick={() => {
                              setModal({ type: 'DELETE', comment: c });
                              setModalText('');
                              setModalErr(null);
                              setModalBusy(false);
                            }}
                          >
                            삭제
                          </Button>
                        </Row>
                      ) : (
                        <span />
                      )}
                    </Row>
                  </div>
                </Item>
              );
            })}
          </List>
        )}

        <ComposerWrap aria-label="댓글 작성 바">
          <Row style={{ gap: 10, overflowX: 'auto', padding: '10px 0' }} aria-label="이모지 빠른 입력">
            {emojis.map((e) => (
              <Button
                key={e}
                type="button"
                $variant="ghost"
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
              </Button>
            ))}
          </Row>

          <Composer>
            {user && profile ? (
              <Avatar size={48} name={profile.name} seed={user.uid} photoURL={profile.photoURL} />
            ) : (
              <div />
            )}

            <InputLike
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={user ? '댓글로 의견을 남겨보세요' : '로그인 후 댓글 작성 가능'}
              aria-label="댓글 입력"
              onFocus={() => {
                if (!user) auth.openLogin({ redirectTo: `/posts/${entryId}` });
              }}
            />

            <SendBtn type="button" onClick={submit} disabled={sending || !text.trim()} aria-label="댓글 등록">
              ↑
            </SendBtn>
          </Composer>

          {!user ? (
            <Row style={{ marginTop: 10, justifyContent: 'flex-end' }}>
              <Button type="button" $variant="primary" onClick={() => auth.openLogin({ redirectTo: `/posts/${entryId}` })}>
                로그인하고 댓글 쓰기
              </Button>
            </Row>
          ) : null}
        </ComposerWrap>

        <Modal
          open={!!modal}
          title={modal?.type === 'EDIT' ? '댓글 수정' : '댓글 삭제'}
          description={
            modal?.type === 'EDIT' ? '댓글 내용을 수정합니다.' : '댓글을 삭제합니다. 삭제는 되돌릴 수 없습니다.'
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
                {modalBusy ? '처리 중…' : modal?.type === 'DELETE' ? '삭제' : '저장'}
              </Button>
            </>
          }
        >
          {modal?.type === 'EDIT' ? (
            <>
              <textarea
                value={modalText}
                onChange={(e) => setModalText(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: 160,
                  borderRadius: 12,
                  border: '1px solid #E5E7EB',
                  padding: 14,
                  fontSize: 18,
                  fontFamily: 'inherit',
                }}
                aria-label="댓글 수정 내용"
              />
              <div style={{ height: 12 }} />
            </>
          ) : null}

          {modalErr ? <ErrorText>{modalErr}</ErrorText> : null}
        </Modal>
      </CardBody>
    </Card>
  );
}