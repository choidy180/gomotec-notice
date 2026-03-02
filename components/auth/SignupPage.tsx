// components/auth/SignupPage.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { getAuthClient } from '../../lib/firebaseClient';
import type { Company } from '../../types/entry';
import { COMPANY_OPTIONS } from '../../config/boardOptions';
import { assertNameAvailable, createUserProfileAndIndex } from '../../lib/firebaseUsers';
import { isValidPhone, makeInternalEmail, normalizeName, normalizePhone } from '../../lib/auth/identity';
import SegmentedControl from '../ui/SegmentedControl';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorText,
  Field,
  HelpText,
  Input,
  Label,
  Row,
  Title,
  SubTitle,
} from '../ui/Controls';

export default function SignupPage() {
  const router = useRouter();
  const auth = getAuthClient();

  const companyOpts = useMemo(
    () => COMPANY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const [company, setCompany] = useState<Company>('GOMOTECH');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);

    const n = normalizeName(name);
    const p = normalizePhone(phone);

    if (!n) return setErr('이름을 입력해 주세요.');
    if (!isValidPhone(p)) return setErr('연락처를 정확히 입력해 주세요. (숫자 10~11자리)');
    if (pw.length < 6) return setErr('비밀번호는 6자 이상을 권장합니다.');
    if (pw !== pw2) return setErr('비밀번호 확인이 일치하지 않습니다.');

    setBusy(true);
    try {
      // 이름(소속 내) 중복 방지
      await assertNameAvailable(company, n);

      const email = makeInternalEmail(company, p);

      // Firebase Auth 계정 생성(내부 이메일 사용)
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      const uid = cred.user.uid;

      // Firestore profile + login index 생성
      await createUserProfileAndIndex({
        uid,
        company,
        name: n,
        phoneNormalized: p,
        email,
      });

      router.push('/');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '회원가입 실패';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card aria-label="회원가입">
      <CardHeader>
        <div>
          <Title>회원가입</Title>
          <SubTitle>소속/이름/연락처/비밀번호로 계정을 만듭니다.</SubTitle>
        </div>
      </CardHeader>

      <CardBody>
        <Field>
          <Label>소속</Label>
          <SegmentedControl
            value={company}
            options={companyOpts}
            onChange={(v) => setCompany(v as Company)}
            ariaLabel="회원가입 소속 선택"
          />
        </Field>

        <div style={{ height: 16 }} />

        <Field>
          <Label htmlFor="name">이름</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" />
          <HelpText>같은 소속 내에서 이름은 중복될 수 없도록(로그인 편의) 처리했습니다.</HelpText>
        </Field>

        <div style={{ height: 16 }} />

        <Field>
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="예: 010-1234-5678"
            inputMode="numeric"
          />
          <HelpText>하이픈(-)은 자동으로 무시되고 숫자만 저장됩니다.</HelpText>
        </Field>

        <div style={{ height: 16 }} />

        <Row style={{ gap: 16 }}>
          <Field style={{ flex: 1 }}>
            <Label htmlFor="pw">비밀번호</Label>
            <Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>

          <Field style={{ flex: 1 }}>
            <Label htmlFor="pw2">비밀번호 확인</Label>
            <Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </Field>
        </Row>

        {err ? <ErrorText style={{ marginTop: 12 }}>{err}</ErrorText> : null}

        <Row style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <Button type="button" $variant="ghost" onClick={() => router.push('/')}>
            취소
          </Button>
          <Button type="button" $variant="primary" onClick={submit} disabled={busy}>
            {busy ? '처리 중…' : '가입하기'}
          </Button>
        </Row>
      </CardBody>
    </Card>
  );
}