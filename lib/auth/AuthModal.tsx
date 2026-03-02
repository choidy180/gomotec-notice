// components/auth/AuthModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import type { Company } from '../../types/entry';
import { COMPANY_OPTIONS } from '../../config/boardOptions';
import Modal from '@/components/ui/Modal';
import { Button, ErrorText, Field, HelpText, Input, Label, Row } from '@/components/ui/Controls';
import SegmentedControl from '@/components/ui/SegmentedControl';

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

  const companyOpts = COMPANY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

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
      const msg = e instanceof Error ? e.message : '로그인 실패';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={auth.loginOpen}
      title="로그인"
      description="글/댓글 작성은 로그인 후 가능합니다."
      onClose={() => auth.closeLogin()}
      footer={
        <>
          <Button type="button" $variant="ghost" onClick={() => auth.closeLogin()}>
            닫기
          </Button>
          <Button type="button" $variant="primary" onClick={submit} disabled={busy}>
            {busy ? '로그인 중…' : '로그인'}
          </Button>
        </>
      }
    >
      <Field>
        <Label>소속</Label>
        <SegmentedControl
          value={company}
          options={companyOpts}
          onChange={(v) => setCompany(v as Company)}
          ariaLabel="로그인 소속 선택"
        />
      </Field>

      <div style={{ height: 14 }} />

      <Field>
        <Label htmlFor="login-name">이름</Label>
        <Input
          id="login-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 홍길동"
          aria-label="로그인 이름"
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </Field>

      <div style={{ height: 14 }} />

      <Field>
        <Label htmlFor="login-pw">비밀번호</Label>
        <Input
          id="login-pw"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호"
          aria-label="로그인 비밀번호"
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
      </Field>

      {err ? <ErrorText style={{ marginTop: 12 }}>{err}</ErrorText> : null}

      <Row style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <HelpText>계정이 없으신가요?</HelpText>
        <Row>
          <Button type="button" $variant="ghost" onClick={() => router.push('/account')}>
            비밀번호 재설정
          </Button>
          <Button type="button" $variant="ghost" onClick={() => router.push('/signup')}>
            회원가입
          </Button>
        </Row>
      </Row>
    </Modal>
  );
}