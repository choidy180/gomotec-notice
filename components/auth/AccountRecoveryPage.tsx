// components/auth/AccountRecoveryPage.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '../../types/entry';
import { COMPANY_OPTIONS } from '../../config/boardOptions';
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
import { isValidPhone, normalizeName, normalizePhone } from '../../lib/auth/identity';

export default function AccountRecoveryPage() {
  const router = useRouter();

  const companyOpts = useMemo(
    () => COMPANY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const [company, setCompany] = useState<Company>('GOMOTECH');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setMsg(null);

    const n = normalizeName(name);
    const p = normalizePhone(phone);

    if (!n) return setErr('이름을 입력해 주세요.');
    if (!isValidPhone(p)) return setErr('연락처를 정확히 입력해 주세요. (숫자 10~11자리)');
    if (newPw.length < 6) return setErr('새 비밀번호는 6자 이상을 권장합니다.');
    if (newPw !== newPw2) return setErr('비밀번호 확인이 일치하지 않습니다.');

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          company,
          name: n,
          phone: p,
          newPassword: newPw,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message ?? '비밀번호 재설정 실패');

      setMsg('✅ 비밀번호가 재설정되었습니다. 로그인해 주세요.');
    } catch (e) {
      const m = e instanceof Error ? e.message : '비밀번호 재설정 실패';
      setErr(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card aria-label="비밀번호 재설정">
      <CardHeader>
        <div>
          <Title>비밀번호 재설정</Title>
          <SubTitle>소속 + 이름 + 연락처로 계정을 확인한 뒤 새 비밀번호로 바꿉니다.</SubTitle>
        </div>
      </CardHeader>

      <CardBody>
        <Field>
          <Label>소속</Label>
          <SegmentedControl
            value={company}
            options={companyOpts}
            onChange={(v) => setCompany(v as Company)}
            ariaLabel="비밀번호 재설정 소속 선택"
          />
        </Field>

        <div style={{ height: 16 }} />

        <Row style={{ gap: 16 }}>
          <Field style={{ flex: 1 }}>
            <Label htmlFor="name">이름</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 홍길동" />
          </Field>
          <Field style={{ flex: 1 }}>
            <Label htmlFor="phone">연락처</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
              inputMode="numeric"
            />
          </Field>
        </Row>

        <div style={{ height: 16 }} />

        <Row style={{ gap: 16 }}>
          <Field style={{ flex: 1 }}>
            <Label htmlFor="npw">새 비밀번호</Label>
            <Input id="npw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </Field>
          <Field style={{ flex: 1 }}>
            <Label htmlFor="npw2">새 비밀번호 확인</Label>
            <Input id="npw2" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
          </Field>
        </Row>

        <HelpText style={{ marginTop: 10 }}>
          ※ 이 기능은 서버(Admin) 설정이 필요합니다. 아래 “설정 가이드”를 꼭 확인하세요.
        </HelpText>

        {msg ? <HelpText style={{ marginTop: 12 }}>{msg}</HelpText> : null}
        {err ? <ErrorText style={{ marginTop: 12 }}>{err}</ErrorText> : null}

        <Row style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <Button type="button" $variant="ghost" onClick={() => router.push('/')}>
            홈으로
          </Button>
          <Button type="button" $variant="primary" onClick={submit} disabled={busy}>
            {busy ? '처리 중…' : '재설정'}
          </Button>
        </Row>
      </CardBody>
    </Card>
  );
}