// components/shell/AppShell.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Container, Row, Button } from '../ui/Controls';
import Avatar from '../ui/Avatar';
import { subscribeUnreadCommentCount } from '../../lib/firebaseComments';
import { useAuth } from '@/lib/auth/AuthProvider';

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(246, 247, 249, 0.88);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Inner = styled.div`
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: 12px ${({ theme }) => theme.space.xl};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
`;

const BrandTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 900;
  letter-spacing: -0.02em;
`;

const BrandDesc = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.muted};
  font-weight: 800;
`;

const IconBtn = styled.button`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${({ theme }) => theme.colors.surface2};
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: white;
  font-weight: 900;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 1 0-14 0v5l-2 2v1h18v-1l-2-2Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M11 11V5h2v6h6v2h-6v6h-2v-6H5v-2h6Z" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user;
  const profile = auth.profile;

  const [unread, setUnread] = useState(0);
  const [capped, setCapped] = useState(false);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      setCapped(false);
      return;
    }

    const unsub = subscribeUnreadCommentCount(
      user.uid,
      (count, isCapped) => {
        setUnread(count);
        setCapped(isCapped);
      },
      (e) => console.error(e)
    );

    return () => unsub();
  }, [user?.uid]);

  const badgeText = capped ? '99+' : unread >= 99 ? '99+' : String(unread);

  return (
    <>
      <Header>
        <Inner>
          <Brand>
            <BrandTitle>스마트공장 접수대장</BrandTitle>
            <BrandDesc>개발진행 / 피드백 / 추가요청</BrandDesc>
          </Brand>

          <Row style={{ gap: 10 }}>
            {user ? (
              <>
                {/* 🔔 알림 */}
                <IconBtn
                  type="button"
                  onClick={() => router.push('/mypage#inbox')}
                  aria-label="알림(내 글 댓글) 보기"
                  title="알림"
                >
                  <BellIcon />
                  {unread > 0 ? <Badge aria-label={`미읽음 ${badgeText}`}>{badgeText}</Badge> : null}
                </IconBtn>

                {/* + 새 글 */}
                <IconBtn
                  type="button"
                  onClick={() => {
                    if (auth.requireAuth({ redirectTo: '/new' })) router.push('/new');
                  }}
                  aria-label="새 글 작성"
                  title="새 글 작성"
                >
                  <PlusIcon />
                </IconBtn>

                {/* 프로필 */}
                {profile ? (
                  <button
                    type="button"
                    onClick={() => router.push('/mypage')}
                    style={{
                      border: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 4,
                      borderRadius: 12,
                    }}
                    aria-label="마이페이지로 이동"
                  >
                    <Avatar size={40} name={profile.name} seed={user.uid} photoURL={profile.photoURL} />
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{profile.name}</div>
                  </button>
                ) : null}

                <Button type="button" $variant="ghost" onClick={() => auth.logout()}>
                  로그아웃
                </Button>
              </>
            ) : (
              <Button type="button" $variant="primary" onClick={() => auth.openLogin()}>
                로그인
              </Button>
            )}
          </Row>
        </Inner>
      </Header>

      <Container as="main">{children}</Container>
    </>
  );
}