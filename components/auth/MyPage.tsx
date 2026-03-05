'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../lib/auth/AuthProvider';
import { getStorageClient } from '../../lib/firebaseClient';
import { updateMyPhoto } from '../../lib/firebaseUsers';
import { subscribeEntriesByAuthorUid } from '../../lib/firebaseEntries';
import { subscribeCommentsOnMyEntries } from '../../lib/firebaseComments';

import type { Entry } from '../../types/entry';
import type { Comment } from '../../types/comment';

import Avatar from '../ui/Avatar';
import EmptyState from '../ui/EmptyState';
import { SkeletonBlock } from '../ui/Skeleton';
import { COMPANY_LABEL } from '../../config/boardOptions';

// --- Styled Components (Toss + Instagram High Density Style) ---

const PageWrapper = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  padding: 24px; /* 외부 여백 최소화 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 24px; /* 섹션 간격 */
`;

/* 인스타그램 프로필 헤더 스타일 */
const ProfileHero = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  background: #FFFFFF;
  border: 1px solid #E5E8EB;
  border-radius: 12px;
  flex-wrap: wrap;
`;

const ProfileLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const AvatarBox = styled.div`
  position: relative;
  width: 88px; /* 인스타그램처럼 적당한 크기의 원형 */
  height: 88px;
`;

const ChangeBtn = styled.button`
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #E5E8EB;
  background: #FFFFFF;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  color: #4E5968;
  transition: all 0.2s;

  &:hover {
    background: #F2F4F6;
    color: #191F28;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Name = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #191F28;
  line-height: 1.2;
  letter-spacing: -0.02em;
`;

const Company = styled.div`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #8B95A1;
`;

const TextStatus = styled.div`
  font-size: 0.8125rem;
  font-weight: 500;
  color: #3182F6;
  margin-top: 4px;
`;

/* 인스타그램 팔로워 수 보여주듯, 작성글/미읽음 요약 */
const StatsContainer = styled.div`
  display: flex;
  gap: 32px;
  align-items: center;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  span {
    font-size: 0.8125rem;
    color: #8B95A1;
    font-weight: 500;
  }

  strong {
    font-size: 1.25rem;
    color: #191F28;
    font-weight: 700;
  }

  strong.highlight {
    color: #F04452; /* 빨간색으로 미읽음 알림 강조 */
  }
`;

const LogoutBtn = styled.button`
  background: transparent;
  border: 1px solid #E5E8EB;
  color: #4E5968;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #F2F4F6;
  }
`;

/* 리스트 섹션 (토스 스타일 테이블/리스트) */
const ListSection = styled.section`
  background: #FFFFFF;
  border: 1px solid #E5E8EB;
  border-radius: 12px;
  overflow: hidden;
`;

const SectionHead = styled.div`
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #F2F4F6;
  background: #FFFFFF;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #191F28;
`;

const SectionCount = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #3182F6;
`;

const SectionBody = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const ListItem = styled.li`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16px 20px;
  border-bottom: 1px solid #F2F4F6;
  background: #FFFFFF;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #F9FAFB;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const ItemRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const ItemTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #191F28;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: #8B95A1;
  flex-shrink: 0;
`;

const CommentContentRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const CommentTextWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0; /* text-overflow 작동을 위해 필수 */
`;

const CommentBody = styled.div`
  font-size: 0.9375rem;
  color: #333D4B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Badge = styled.span<{ $type?: 'unread' | 'read' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
  background: ${({ $type }) => ($type === 'unread' ? '#FEECEE' : '#F2F4F6')};
  color: ${({ $type }) => ($type === 'unread' ? '#F04452' : '#8B95A1')};
`;

// --- Helpers ---
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

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

// --- Component ---
export default function MyPage() {
  const auth = useAuth();
  const router = useRouter();
  const storage = getStorageClient();

  const user = auth.user;
  const profile = auth.profile;

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState<string | null>(null);

  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesErr, setEntriesErr] = useState<string | null>(null);

  const [myComments, setMyComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsErr, setCommentsErr] = useState<string | null>(null);

  const uidForRender = user?.uid ?? null;

  const unreadCount = useMemo(() => {
    if (!uidForRender) return 0;
    return myComments.filter((c) => c.entryAuthorUid === uidForRender && !c.readByEntryAuthorAt).length;
  }, [myComments, uidForRender]);

  useEffect(() => {
    const uidNow = auth.user?.uid;
    if (!uidNow) return;

    setEntriesLoading(true);
    setEntriesErr(null);

    const unsub = subscribeEntriesByAuthorUid(
      uidNow,
      { max: 30 },
      (items) => {
        setMyEntries(items);
        setEntriesLoading(false);
      },
      (e) => {
        console.error(e);
        setEntriesErr(e.message);
        setEntriesLoading(false);
      }
    );

    return () => unsub();
  }, [auth.user?.uid]);

  useEffect(() => {
    const uidNow = auth.user?.uid;
    if (!uidNow) return;

    setCommentsLoading(true);
    setCommentsErr(null);

    const unsub = subscribeCommentsOnMyEntries(
      uidNow,
      { max: 50 },
      (items) => {
        setMyComments(items);
        setCommentsLoading(false);
      },
      (e) => {
        console.error(e);
        setCommentsErr(e.message);
        setCommentsLoading(false);
      }
    );

    return () => unsub();
  }, [auth.user?.uid]);

  if (auth.loading) {
    return (
      <PageWrapper>
        <EmptyState title="준비 중…" description="로그인 상태를 확인하고 있어요." />
      </PageWrapper>
    );
  }

  if (!user || !profile || !uidForRender) {
    return (
      <PageWrapper>
        <EmptyState
          title="로그인이 필요합니다"
          description="마이페이지는 로그인 후 사용할 수 있어요."
          actionLabel="로그인"
          onAction={() => auth.openLogin({ redirectTo: '/mypage' })}
        />
      </PageWrapper>
    );
  }

  const myUid = uidForRender;
  const myName = profile.name;
  const myCompany = profile.company;
  const myPhotoURL = profile.photoURL ?? null;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const uidNow = auth.user?.uid;
    if (!uidNow) {
      auth.openLogin({ redirectTo: '/mypage' });
      return;
    }

    setPhotoErr(null);

    if (!file.type.startsWith('image/')) {
      setPhotoErr('이미지 파일만 업로드할 수 있어요.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setPhotoErr('파일이 너무 큽니다. (최대 3MB)');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setPhotoBusy(true);
    try {
      const path = `avatars/${uidNow}.webp`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });

      const url = await getDownloadURL(storageRef);
      await updateMyPhoto(uidNow, url);
    } catch (e2) {
      setPhotoErr(e2 instanceof Error ? e2.message : '업로드 실패');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <PageWrapper>
      {/* 1. 프로필 히어로 영역 */}
      <ProfileHero aria-label="내 프로필">
        <ProfileLeft>
          <AvatarBox>
            <Avatar size={88} name={myName} seed={myUid} photoURL={myPhotoURL} />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickFile}
              style={{ display: 'none' }}
              aria-label="프로필 사진 선택"
            />
            <ChangeBtn type="button" onClick={() => fileRef.current?.click()} aria-label="프로필 사진 변경" disabled={photoBusy}>
              <PencilIcon />
            </ChangeBtn>
          </AvatarBox>

          <ProfileInfo>
            <Name>{myName}</Name>
            <Company>{COMPANY_LABEL[myCompany]}</Company>
            {photoBusy && <TextStatus>사진 업로드 중…</TextStatus>}
            {photoErr && <TextStatus style={{ color: '#F04452' }}>{photoErr}</TextStatus>}
          </ProfileInfo>
        </ProfileLeft>

        <StatsContainer>
          <StatItem>
            <span>작성글</span>
            <strong>{myEntries.length}</strong>
          </StatItem>
          <StatItem>
            <span>새 댓글</span>
            <strong className={unreadCount > 0 ? 'highlight' : ''}>{unreadCount}</strong>
          </StatItem>
          <LogoutBtn type="button" onClick={() => auth.logout()}>
            로그아웃
          </LogoutBtn>
        </StatsContainer>
      </ProfileHero>

      {/* 2. 내가 쓴 게시글 */}
      <ListSection aria-label="내가 쓴 게시글">
        <SectionHead>
          <SectionTitle>내가 쓴 게시글</SectionTitle>
          <SectionCount>{myEntries.length}</SectionCount>
        </SectionHead>

        <SectionBody>
          {entriesLoading ? (
            <div style={{ padding: '16px 20px' }}>
              <SkeletonBlock $h={20} $w="40%" style={{ marginBottom: 8 }} />
              <SkeletonBlock $h={16} $w="20%" />
            </div>
          ) : entriesErr ? (
            <EmptyState title="내 글을 불러오지 못했어요" description={`에러: ${entriesErr}`} />
          ) : myEntries.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#8B95A1', fontSize: '0.9375rem' }}>
              아직 작성한 글이 없어요. 상단 + 버튼으로 등록해보세요.
            </div>
          ) : (
            myEntries.map((e) => (
              <ListItem key={e.id} onClick={() => router.push(`/posts/${e.id}`)} aria-label={`내 글 ${e.title}`}>
                <ItemRow>
                  <ItemTitle>{e.title}</ItemTitle>
                  <ItemMeta>{e.process} · {e.detail}</ItemMeta>
                </ItemRow>
              </ListItem>
            ))
          )}
        </SectionBody>
      </ListSection>

      {/* 3. 내 게시글에 달린 댓글 (Inbox) */}
      <ListSection aria-label="내 게시글에 달린 댓글" id="inbox">
        <SectionHead>
          <SectionTitle>알림 및 댓글</SectionTitle>
          <SectionCount>{myComments.length}</SectionCount>
        </SectionHead>

        <SectionBody>
          {commentsLoading ? (
            <div style={{ padding: '16px 20px' }}>
              <SkeletonBlock $h={20} $w="50%" style={{ marginBottom: 8 }} />
              <SkeletonBlock $h={16} $w="80%" />
            </div>
          ) : commentsErr ? (
            <EmptyState title="댓글을 불러오지 못했어요" description={`에러: ${commentsErr}`} />
          ) : myComments.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#8B95A1', fontSize: '0.9375rem' }}>
              아직 내 글에 달린 댓글이 없어요.
            </div>
          ) : (
            myComments.map((c) => {
              const isUnread = !c.readByEntryAuthorAt;
              const ts = c.createdAt?.toDate?.() ?? null;
              const timeLabel = ts ? relTime(ts) : '기록중…';

              return (
                <ListItem key={c.id} onClick={() => router.push(`/posts/${c.entryId}`)} aria-label={`댓글: ${c.entryTitle}`}>
                  <CommentContentRow>
                    <Avatar size={40} name={c.authorName} seed={c.authorUid} photoURL={c.authorPhotoURL} />
                    
                    <CommentTextWrap>
                      <ItemRow style={{ gap: 8 }}>
                        <ItemMeta style={{ color: '#191F28', fontWeight: 600 }}>{c.authorName}</ItemMeta>
                        <ItemMeta style={{ fontSize: '0.75rem' }}>{timeLabel}</ItemMeta>
                      </ItemRow>
                      
                      <CommentBody>{c.content}</CommentBody>
                      
                      <ItemTitle style={{ fontSize: '0.8125rem', color: '#8B95A1', marginTop: 2 }}>
                        원문: {c.entryTitle}
                      </ItemTitle>
                    </CommentTextWrap>

                    {isUnread ? <Badge $type="unread">새 댓글</Badge> : <Badge $type="read">읽음</Badge>}
                  </CommentContentRow>
                </ListItem>
              );
            })
          )}
        </SectionBody>
      </ListSection>
    </PageWrapper>
  );
}