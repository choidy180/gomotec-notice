// components/shell/AppShell.tsx
'use client';

import styled from 'styled-components';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Next.js 이미지 컴포넌트 추가

import { Container, Row, Button } from '../ui/Controls';
import Avatar from '../ui/Avatar';
import { subscribeUnreadCommentCount } from '../../lib/firebaseComments';
import { useAuth } from '@/lib/auth/AuthProvider';

// --- Styled Components (Toss-style Navigation) ---

const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid #E5E8EB;
  transition: background-color 0.2s ease;
`;

const Inner = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  padding: 12px 5%; 
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const BrandLink = styled(Link)`
  display: flex;
  align-items: center; /* 로고와 텍스트를 수평 중앙 정렬 */
  gap: 10px; /* 로고와 텍스트 사이 간격 */
  text-decoration: none;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px; 
  border-radius: 8px;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #F2F4F6;
  }
  
  &:active {
    background-color: #E5E8EB;
  }
`;

// 텍스트들을 묶어줄 래퍼 추가
const BrandTextWrapper = styled.div`
  display: flex;
  flex-direction: column;
`;

const BrandTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: #191F28;
  letter-spacing: -0.02em;
  margin-bottom: 2px;
`;

const BrandDesc = styled.div`
  font-size: 0.8125rem;
  color: #8B95A1;
  font-weight: 500;
`;

const IconBtn = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: none;
  background: transparent;
  color: #4E5968;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: #F2F4F6;
    color: #191F28;
  }

  &:active {
    background: #E5E8EB;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #F04452; 
  color: #FFFFFF;
  font-weight: 700;
  font-size: 0.6875rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #FFFFFF; 
`;

const ProfileBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #F2F4F6;
  }
  
  &:active {
    background: #E5E8EB;
  }
`;

const ProfileName = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
  color: #191F28;
`;

// --- Icons ---
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}

// --- Component ---
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
      (e) => console.warn('알림 권한 대기중:', e.message)
    );

    return () => unsub();
  }, [user?.uid]);

  const badgeText = capped ? '99+' : unread >= 99 ? '99+' : String(unread);

  return (
    <>
      <Header>
        <Inner>
          <BrandLink href="/" aria-label="메인 화면으로 이동">
            {/* 1. 로고 이미지 추가 */}
            <Image 
              src="/logo.png" // public 폴더 안에 들어갈 이미지 파일명
              alt="스마트공장 로고" 
              width={36} 
              height={56} 
              style={{ objectFit: 'contain', borderRadius: '8px' }}
              priority // 헤더 로고이므로 최우선 로딩
            />
            {/* 2. 텍스트들을 BrandTextWrapper로 묶음 */}
            <BrandTextWrapper>
              <BrandTitle>스마트공장 접수대장</BrandTitle>
              <BrandDesc>개발진행 · 피드백 · 추가요청</BrandDesc>
            </BrandTextWrapper>
          </BrandLink>

          <Row style={{ gap: '8px' }}>
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
                  <ProfileBtn
                    type="button"
                    onClick={() => router.push('/mypage')}
                    aria-label="마이페이지로 이동"
                  >
                    <Avatar size={32} name={profile.name} seed={user.uid} photoURL={profile.photoURL} />
                    <ProfileName>{profile.name}</ProfileName>
                  </ProfileBtn>
                ) : null}

                <Button 
                  type="button" 
                  $variant="ghost" 
                  onClick={() => auth.logout()}
                  style={{ marginLeft: '4px', padding: '6px 12px', fontSize: '0.875rem', color: '#8B95A1' }}
                >
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