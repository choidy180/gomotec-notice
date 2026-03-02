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
import { Button, Chip, Divider, ErrorText, HelpText, Row } from '../ui/Controls';
import { COMPANY_LABEL } from '../../config/boardOptions';

const Wrap = styled.div`
  display: grid;
  gap: 16px;
`;

const ProfileHero = styled.section`
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 18px;
  align-items: center;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
`;

const AvatarBox = styled.div`
  position: relative;
  width: 124px;
  height: 124px;
`;

const ChangeBtn = styled.button`
  position: absolute;
  right: -2px;
  bottom: -2px;

  /* ✅ 버튼은 더 작게 */
  width: 34px;
  height: 34px;

  /* ✅ 덜 둥근 모던 스타일 */
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};

  /* ✅ 아이콘 중앙 정렬 */
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /* 살짝 떠 보이게 */
  box-shadow: 0 6px 18px rgba(17, 24, 39, 0.12);
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surface2};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* ✅ 아이콘은 더 크게 */
  svg {
    width: 20px;
    height: 20px;
  }
`;

const NameCol = styled.div`
  display: grid;
  gap: 8px;
`;

const Name = styled.div`
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.02em;
`;

const Company = styled.div`
  font-size: 18px;
  font-weight: 900;
  color: ${({ theme }) => theme.colors.muted};
`;

const ListSection = styled.section`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
`;

const SectionHead = styled.div`
  padding: 16px 18px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 900;
`;

const SectionBody = styled.div`
  padding: 16px 18px;
`;

const ItemBtn = styled.button`
  width: 100%;
  text-align: left;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface2};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 14px;
  cursor: pointer;
  display: grid;
  gap: 8px;

  &:hover {
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const ItemTitle = styled.div`
  font-size: 18px;
  font-weight: 900;
`;

const ItemMeta = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.muted};
`;

const CommentRow = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr auto;
  gap: 12px;
  align-items: center;
`;

const UnreadDot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52px;
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-weight: 900;
  font-size: 14px;
`;

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

  // ✅ 렌더 표시용 uid (string | null)
  const uidForRender = user?.uid ?? null;

  const unreadCount = useMemo(() => {
    if (!uidForRender) return 0;
    return myComments.filter((c) => c.entryAuthorUid === uidForRender && !c.readByEntryAuthorAt).length;
  }, [myComments, uidForRender]);

  // ✅ 구독: effect 안에서 “string 확정값(uidNow)”로만 호출
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
    // auth.user?.uid만 의존시키면 충분 (auth 객체 자체를 deps에 넣지 마)
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
    return <EmptyState title="준비 중…" description="로그인 상태를 확인하고 있어요." />;
  }

  if (!user || !profile || !uidForRender) {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="마이페이지는 로그인 후 사용할 수 있어요."
        actionLabel="로그인"
        onAction={() => auth.openLogin({ redirectTo: '/mypage' })}
      />
    );
  }

  // ✅ 여기부터는 “현재 렌더 시점”에서는 uidForRender가 string
  const myUid = uidForRender; // string
  const myName = profile.name;
  const myCompany = profile.company;
  const myPhotoURL = profile.photoURL ?? null;

  // ✅ 핵심: 이벤트 핸들러 안에서 uid를 다시 꺼내서 string으로 확정시키기
  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이벤트가 발생한 "그 순간"의 uid를 다시 읽음 (TS 안전 + 실제 동작도 안전)
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
      // ✅ 1인 1파일 덮어쓰기(고정 경로)
      const path = `avatars/${uidNow}.webp`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });

      const url = await getDownloadURL(storageRef);
      await updateMyPhoto(uidNow, url); // ✅ uidNow는 string 확정
    } catch (e2) {
      const msg = e2 instanceof Error ? e2.message : '업로드 실패';
      setPhotoErr(msg);
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Wrap>
      <ProfileHero aria-label="내 프로필">
        <AvatarBox>
          <Avatar size={124} name={myName} seed={myUid} photoURL={myPhotoURL} />

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onPickFile}
            style={{ display: 'none' }}
            aria-label="프로필 사진 선택"
          />

          <ChangeBtn
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="프로필 사진 변경"
            title="프로필 사진 변경"
            disabled={photoBusy}
          >
            <PencilIcon/>
          </ChangeBtn>
        </AvatarBox>

        <NameCol>
          <Company>{COMPANY_LABEL[myCompany]}</Company>
          <Name>{myName}</Name>

          <Row style={{ gap: 10, marginTop: 4 }}>
            {unreadCount > 0 ? <UnreadDot aria-label={`미읽음 댓글 ${unreadCount}개`}>미읽음 {unreadCount}</UnreadDot> : null}
            <Chip>내 정보 보기</Chip>
          </Row>

          {photoBusy ? <HelpText style={{ marginTop: 8 }}>사진 업로드 중…</HelpText> : null}
          {photoErr ? <ErrorText style={{ marginTop: 8 }}>{photoErr}</ErrorText> : null}
        </NameCol>
      </ProfileHero>

      {/* 내가 쓴 글 */}
      <ListSection aria-label="내가 쓴 게시글">
        <SectionHead>
          <SectionTitle>내가 쓴 게시글</SectionTitle>
          <HelpText>{myEntries.length}개</HelpText>
        </SectionHead>

        <SectionBody>
          {entriesLoading ? (
            <>
              <SkeletonBlock $h={18} $w="40%" />
              <div style={{ height: 10 }} />
              <SkeletonBlock $h={52} $w="100%" />
              <div style={{ height: 10 }} />
              <SkeletonBlock $h={52} $w="100%" />
            </>
          ) : entriesErr ? (
            <EmptyState title="내 글을 불러오지 못했어요" description={`에러: ${entriesErr}`} />
          ) : myEntries.length === 0 ? (
            <EmptyState title="아직 작성한 글이 없어요" description="상단 + 새 글 작성으로 등록해보세요." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {myEntries.map((e) => (
                <ItemBtn key={e.id} type="button" onClick={() => router.push(`/posts/${e.id}`)} aria-label={`내 글 ${e.title}`}>
                  <ItemTitle>{e.title}</ItemTitle>
                  <ItemMeta>
                    {e.process} · {e.detail}
                  </ItemMeta>
                </ItemBtn>
              ))}
            </div>
          )}
        </SectionBody>
      </ListSection>

      {/* 내 글에 달린 댓글 */}
      <ListSection aria-label="내 게시글에 달린 댓글" id="inbox">
        <SectionHead>
          <SectionTitle>내 게시글에 달린 댓글</SectionTitle>
          <HelpText>{myComments.length}개</HelpText>
        </SectionHead>

        <SectionBody>
          {commentsLoading ? (
            <>
              <SkeletonBlock $h={18} $w="52%" />
              <div style={{ height: 10 }} />
              <SkeletonBlock $h={70} $w="100%" />
              <div style={{ height: 10 }} />
              <SkeletonBlock $h={70} $w="100%" />
            </>
          ) : commentsErr ? (
            <EmptyState title="댓글을 불러오지 못했어요" description={`에러: ${commentsErr}`} />
          ) : myComments.length === 0 ? (
            <EmptyState title="아직 댓글이 없어요" description="누군가 내 글에 댓글을 달면 여기에 보여요." />
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {myComments.map((c) => {
                const isUnread = !c.readByEntryAuthorAt;
                const ts = c.createdAt?.toDate?.() ?? null;
                const timeLabel = ts ? relTime(ts) : '기록중…';

                return (
                  <ItemBtn
                    key={c.id}
                    type="button"
                    onClick={() => router.push(`/posts/${c.entryId}`)}
                    aria-label={`댓글: ${c.entryTitle}`}
                  >
                    <CommentRow>
                      <Avatar size={52} name={c.authorName} seed={c.authorUid} photoURL={c.authorPhotoURL} />
                      <div style={{ display: 'grid', gap: 6 }}>
                        <ItemTitle style={{ fontSize: 16 }}>{c.entryTitle}</ItemTitle>
                        <ItemMeta>
                          {c.authorName} · {timeLabel}
                        </ItemMeta>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                          {c.content.length > 80 ? `${c.content.slice(0, 80)}…` : c.content}
                        </div>
                      </div>
                      {isUnread ? <UnreadDot>안읽음</UnreadDot> : <Chip>읽음</Chip>}
                    </CommentRow>
                  </ItemBtn>
                );
              })}
            </div>
          )}
        </SectionBody>
      </ListSection>

      <Divider />

      <Row style={{ justifyContent: 'flex-end' }}>
        <Button type="button" $variant="danger" onClick={() => auth.logout()}>
          로그아웃
        </Button>
      </Row>
    </Wrap>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 2.83H5v-.92l8.06-8.06.92.92L5.92 20.08ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"
      />
    </svg>
  );
}