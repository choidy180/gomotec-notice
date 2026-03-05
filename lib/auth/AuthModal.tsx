// components/auth/AuthModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import { useAuth } from './AuthProvider';
import type { Company } from '../../types/entry';
import { COMPANY_OPTIONS } from '../../config/boardOptions';
import Modal from '@/components/ui/Modal';
import { ErrorText, Input } from '@/components/ui/Controls';

// --- Styled Components (Toss Slim & Cohesive Style) ---

const FormWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px; 
  padding-top: 4px;
`;

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px; 
`;

const LabelText = styled.label`
  font-size: 0.8125rem; /* 라벨 크기를 더 줄여서 인풋을 강조 */
  font-weight: 600;
  color: #4E5968; 
`;

// 1. 소속 선택 (슬림형 토글)
const SegmentWrap = styled.div`
  display: flex;
  background: #F2F4F6;
  border-radius: 8px;
  padding: 4px;
`;

const SegmentBtn = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 0;
  border-radius: 6px;
  border: none;
  font-size: 0.875rem;
  font-weight: ${({ $active }) => ($active ? '600' : '500')};
  color: ${({ $active }) => ($active ? '#191F28' : '#8B95A1')};
  background: ${({ $active }) => ($active ? '#FFFFFF' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ $active }) => ($active ? '#191F28' : '#4E5968')};
  }
`;

// 2. 모달 하단 버튼 (비율에 맞춰 꽉 차는 슬림 버튼)
const FooterWrap = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
`;

const ActionBtn = styled.button<{ $primary?: boolean }>`
  flex: 1; /* 반반씩 공간 차지 */
  padding: 12px 0; /* 기존 공통 버튼보다 위아래 여백을 줄임 */
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  
  background: ${({ $primary }) => ($primary ? '#3182F6' : '#F2F4F6')};
  color: ${({ $primary }) => ($primary ? '#FFFFFF' : '#4E5968')};

  &:hover {
    background: ${({ $primary }) => ($primary ? '#1B64DA' : '#E5E8EB')};
  }

  &:disabled {
    background: ${({ $primary }) => ($primary ? '#A4C6FB' : '#F9FAFB')};
    cursor: not-allowed;
  }
`;

const BottomArea = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #F2F4F6;
`;

const TextLink = styled.button`
  background: transparent;
  border: none;
  color: #8B95A1;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: #F2F4F6;
    color: #4E5968;
  }
`;

const Divider = styled.div`
  width: 1px;
  height: 12px;
  background-color: #E5E8EB;
`;

// --- Component ---

export default function AuthModal() {
  const router = useRouter();
  const auth = useAuth();

  const [company, setCompany] = useState<Company>('GOMOTECH');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.loginOpen) return;
    setErr(null);
    setBusy(false);
    setPw('');
  }, [auth.loginOpen]);

  async function submit() {
    setErr(null);

    if (!name.trim()) {
      setErr('이름을 입력해 주세요.');
      return;
    }
    if (!pw.trim()) {
      setErr('비밀번호를 입력해 주세요.');
      return;
    }

    setBusy(true);
    try {
      const redirect = auth.redirectTo;
      await auth.login({ company, name: name.trim(), password: pw.trim() });

      auth.closeLogin();

      if (redirect) router.push(redirect);
    } catch (e) {
      setErr(e instanceof Error ? e.message : '로그인 실패');
    } finally {
      setBusy(false);
    }
  }

  const navigateTo = (path: string) => {
    auth.closeLogin();
    router.push(path);
  };

  return (
    <Modal
      open={auth.loginOpen}
      title="로그인"
      description="글과 댓글을 작성하려면 로그인이 필요해요."
      onClose={() => auth.closeLogin()}
      footer={
        <FooterWrap>
          <ActionBtn type="button" onClick={() => auth.closeLogin()}>
            닫기
          </ActionBtn>
          <ActionBtn $primary type="button" onClick={submit} disabled={busy}>
            {busy ? '로그인 중…' : '로그인'}
          </ActionBtn>
        </FooterWrap>
      }
    >
      <FormWrap>
        <FieldBlock>
          <LabelText>소속</LabelText>
          <SegmentWrap aria-label="로그인 소속 선택">
            {COMPANY_OPTIONS.map((o) => (
              <SegmentBtn
                key={o.value}
                type="button"
                $active={company === o.value}
                onClick={() => setCompany(o.value as Company)}
              >
                {o.label}
              </SegmentBtn>
            ))}
          </SegmentWrap>
        </FieldBlock>

        <FieldBlock>
          <LabelText htmlFor="login-name">이름</LabelText>
          <Input
            id="login-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="홍길동"
            aria-label="로그인 이름"
            style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.9375rem' }} // 인풋도 살짝 슬림하게 인라인 조정
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </FieldBlock>

        <FieldBlock>
          <LabelText htmlFor="login-pw">비밀번호</LabelText>
          <Input
            id="login-pw"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호를 입력해주세요"
            aria-label="로그인 비밀번호"
            style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '0.9375rem' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </FieldBlock>
      </FormWrap>

      {err ? <ErrorText style={{ marginTop: 12, fontSize: '0.875rem' }}>{err}</ErrorText> : null}

      <BottomArea>
        <TextLink type="button" onClick={() => navigateTo('/account')}>
          비밀번호 재설정
        </TextLink>
        <Divider />
        <TextLink type="button" onClick={() => navigateTo('/signup')} style={{ color: '#3182F6', fontWeight: 600 }}>
          회원가입
        </TextLink>
      </BottomArea>
    </Modal>
  );
}