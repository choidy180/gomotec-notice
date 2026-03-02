'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { DevStatus, Entry, EntryCategory } from '../../types/entry';
import {
  CATEGORY_OPTIONS,
  DEV_STATUS_OPTIONS,
  PROCESS_DETAILS,
  PROCESS_OPTIONS,
  COMPANY_LABEL,
} from '../../config/boardOptions';
import { createEntry, updateEntry } from '../../lib/firebaseEntries';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button, Card, CardBody, CardHeader, Chip, ErrorText, Field, HelpText, Input, Label, LinkButton, Row, SubTitle, Textarea, Title } from '@/components/ui/Controls';
import SegmentedControl from '@/components/ui/SegmentedControl';
import ProcessTabs from '@/components/ui/ProcessTabs';
import OptionGridRadio from '@/components/ui/OptionGridRadio';

const Section = styled.section`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface2};
`;

const StepTitle = styled.h3`
  margin: 0 0 12px;
  font-size: ${({ theme }) => theme.fontSize.lg};
  font-weight: 900;
`;

type Mode = 'create' | 'edit';

type Draft = {
  category: EntryCategory | '';
  process: string;
  detail: string;

  devStatus: DevStatus | '';
  plannedStartLocal: string;
  plannedEndLocal: string;

  title: string;
  content: string;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toDateTimeLocalValue(date: Date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function localDateTimeStringToDate(local: string): Date | null {
  if (!local) return null;
  const [dateStr, timeStr] = local.split('T');
  if (!dateStr || !timeStr) return null;

  const [y, m, d] = dateStr.split('-').map((v) => Number(v));
  const [hh, mm] = timeStr.split(':').map((v) => Number(v));
  if ([y, m, d, hh, mm].some((v) => Number.isNaN(v))) return null;

  const dt = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function toTimestampOrNull(local: string) {
  const dt = localDateTimeStringToDate(local);
  if (!dt) return null;
  return FirestoreTimestamp.fromDate(dt);
}

function validate(d: Draft) {
  const errors: Partial<Record<keyof Draft, string>> = {};

  if (!d.category) errors.category = '항목을 선택해 주세요.';
  if (!d.process) errors.process = '공정을 선택해 주세요.';
  if (!d.detail) errors.detail = '세부항목을 선택해 주세요.';
  if (!d.title.trim()) errors.title = '제목은 필수입니다.';
  if (!d.content.trim()) errors.content = '내용은 필수입니다.';

  if (d.category === 'DEV') {
    if (!d.devStatus) errors.devStatus = '개발 상태를 선택해 주세요.';
    if (!d.plannedStartLocal) errors.plannedStartLocal = '개발 시작예정시간은 필수입니다.';
    if (!d.plannedEndLocal) errors.plannedEndLocal = '개발 종료예정시간은 필수입니다.';

    const s = localDateTimeStringToDate(d.plannedStartLocal);
    const e = localDateTimeStringToDate(d.plannedEndLocal);
    if (s && e && s.getTime() >= e.getTime()) errors.plannedEndLocal = '종료는 시작보다 늦어야 합니다.';
  }

  return errors;
}

export default function EntryForm({
  mode,
  initial,
  entryId,
  onDone,
}: {
  mode: Mode;
  initial?: Entry;
  entryId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const auth = useAuth();

  // ✅ TS null 방지: 로컬로 고정
  const user = auth.user;
  const profile = auth.profile;

  const initialProcess = initial?.process ?? PROCESS_OPTIONS[0];
  const initialDetail =
    initial?.detail ?? (PROCESS_DETAILS[initialProcess]?.[0] ?? '');

  const [draft, setDraft] = useState<Draft>(() => ({
    category: initial?.category ?? '',
    process: initialProcess,
    detail: initialDetail,

    devStatus: initial?.devStatus ?? '',
    plannedStartLocal: initial?.plannedStartAt ? toDateTimeLocalValue(initial.plannedStartAt.toDate()) : '',
    plannedEndLocal: initial?.plannedEndAt ? toDateTimeLocalValue(initial.plannedEndAt.toDate()) : '',

    title: initial?.title ?? '',
    content: initial?.content ?? '',
  }));

  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );
  const devStatusOptions = useMemo(
    () => DEV_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const detailOptions = useMemo(() => {
    return PROCESS_DETAILS[draft.process] ? [...PROCESS_DETAILS[draft.process]] : [];
  }, [draft.process]);

  useEffect(() => {
    const nextList = PROCESS_DETAILS[draft.process] ?? [];
    const nextDetail = nextList[0] ?? '';
    if (!nextList.includes(draft.detail)) setDraft((p) => ({ ...p, detail: nextDetail }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.process]);

  useEffect(() => {
    if (draft.category !== 'DEV') {
      setDraft((p) => ({ ...p, devStatus: '', plannedStartLocal: '', plannedEndLocal: '' }));
    }
  }, [draft.category]);

  async function onSubmit() {
    setStatusMsg(null);

    if (!user || !profile) {
      auth.openLogin({ redirectTo: '/new' });
      return;
    }

    const nextErrors = validate(draft);
    setErrors(nextErrors);

    const first = Object.keys(nextErrors)[0] as keyof Draft | undefined;
    if (first) {
      document.getElementById(`field-${first}`)?.focus?.();
      return;
    }

    setSubmitting(true);
    try {
      const common = {
        category: draft.category as EntryCategory,
        process: draft.process,
        detail: draft.detail,
        title: draft.title.trim(),
        content: draft.content.trim(),
      };

      const devOnly =
        draft.category === 'DEV'
          ? {
              devStatus: draft.devStatus as DevStatus,
              plannedStartAt: toTimestampOrNull(draft.plannedStartLocal),
              plannedEndAt: toTimestampOrNull(draft.plannedEndLocal),
            }
          : { devStatus: null, plannedStartAt: null, plannedEndAt: null };

      if (mode === 'create') {
        await createEntry({
          ...common,
          ...devOnly,
          authorUid: user.uid,
          authorName: profile.name,
          company: profile.company,
          authorPhotoURL: profile.photoURL,
        });

        router.push('/');
        return;
      }

      if (!entryId) throw new Error('entryId가 없습니다.');
      await updateEntry(entryId, { ...common, ...devOnly });

      setStatusMsg('✅ 수정이 완료되었습니다.');
      onDone?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      setStatusMsg(`❌ 실패: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card aria-label={mode === 'create' ? '새 글 작성' : '글 수정'}>
      <CardHeader>
        <div>
          <Title>{mode === 'create' ? '새 글 작성' : '글 수정'}</Title>
          <SubTitle>작성자는 로그인 정보로 자동 입력됩니다.</SubTitle>

          {profile ? (
            <Row style={{ marginTop: 10 }}>
              <Chip $tone="primary">{COMPANY_LABEL[profile.company]}</Chip>
              <Chip>{profile.name}</Chip>
            </Row>
          ) : null}
        </div>

        <Row>
          <LinkButton href="/" $variant="ghost">
            목록
          </LinkButton>
        </Row>
      </CardHeader>

      <CardBody>
        <Section id="field-category" tabIndex={-1}>
          <StepTitle>1) 항목 선택</StepTitle>
          <SegmentedControl
            value={draft.category}
            options={categoryOptions}
            onChange={(v) => setDraft((p) => ({ ...p, category: v as EntryCategory }))}
            ariaLabel="항목 선택"
            describedBy={errors.category ? 'err-category' : undefined}
          />
          {errors.category && <ErrorText id="err-category">{errors.category}</ErrorText>}
        </Section>

        <div style={{ height: 16 }} />

        <Section id="field-process" tabIndex={-1}>
          <StepTitle>2) 공정 / 세부항목 선택</StepTitle>

          <Label>공정</Label>
          <ProcessTabs
            value={draft.process}
            options={PROCESS_OPTIONS}
            includeAll={false}
            onChange={(v) => setDraft((p) => ({ ...p, process: v }))}
            ariaLabel="공정 선택"
          />
          {errors.process && <ErrorText>{errors.process}</ErrorText>}

          <div style={{ height: 14 }} />

          <Label>세부항목</Label>
          <div id="field-detail" tabIndex={-1} />
          <OptionGridRadio
            value={draft.detail}
            options={detailOptions}
            onChange={(v) => setDraft((p) => ({ ...p, detail: v }))}
            ariaLabel="세부항목 선택"
            describedBy={errors.detail ? 'err-detail' : undefined}
          />
          {errors.detail && <ErrorText id="err-detail">{errors.detail}</ErrorText>}
        </Section>

        <div style={{ height: 16 }} />

        {draft.category === 'DEV' ? (
          <>
            <Section>
              <StepTitle>3) 개발진행 정보 (필수)</StepTitle>

              <div id="field-devStatus" tabIndex={-1} />
              <Label>개발 상태</Label>
              <SegmentedControl
                value={draft.devStatus}
                options={devStatusOptions}
                onChange={(v) => setDraft((p) => ({ ...p, devStatus: v as DevStatus }))}
                ariaLabel="개발 상태 선택"
                describedBy={errors.devStatus ? 'err-devStatus' : undefined}
              />
              {errors.devStatus && <ErrorText id="err-devStatus">{errors.devStatus}</ErrorText>}

              <div style={{ height: 14 }} />

              <Row style={{ gap: 16 }}>
                <Field style={{ flex: 1 }} id="field-plannedStartLocal" tabIndex={-1}>
                  <Label htmlFor="plannedStart">개발 시작예정시간 (필수)</Label>
                  <Input
                    id="plannedStart"
                    type="datetime-local"
                    value={draft.plannedStartLocal}
                    onChange={(e) => setDraft((p) => ({ ...p, plannedStartLocal: e.target.value }))}
                    aria-label="개발 시작예정시간"
                  />
                  {errors.plannedStartLocal && <ErrorText>{errors.plannedStartLocal}</ErrorText>}
                </Field>

                <Field style={{ flex: 1 }} id="field-plannedEndLocal" tabIndex={-1}>
                  <Label htmlFor="plannedEnd">개발 종료예정시간 (필수)</Label>
                  <Input
                    id="plannedEnd"
                    type="datetime-local"
                    value={draft.plannedEndLocal}
                    onChange={(e) => setDraft((p) => ({ ...p, plannedEndLocal: e.target.value }))}
                    aria-label="개발 종료예정시간"
                  />
                  {errors.plannedEndLocal && <ErrorText>{errors.plannedEndLocal}</ErrorText>}
                </Field>
              </Row>

              <HelpText>※ 종료 예정시간은 시작 예정시간보다 늦어야 합니다.</HelpText>
            </Section>

            <div style={{ height: 16 }} />
          </>
        ) : null}

        <Section>
          <StepTitle>4) 내용 작성</StepTitle>

          <Field id="field-title" tabIndex={-1}>
            <Label htmlFor="title">제목 (필수)</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
              placeholder="예: 공정설비 - 발포설비 예지보전 기능 개선"
              aria-label="제목"
            />
            {errors.title && <ErrorText>{errors.title}</ErrorText>}
          </Field>

          <div style={{ height: 14 }} />

          <Field id="field-content" tabIndex={-1}>
            <Label htmlFor="content">내용 (필수)</Label>
            <Textarea
              id="content"
              value={draft.content}
              onChange={(e) => setDraft((p) => ({ ...p, content: e.target.value }))}
              placeholder="상세 내용(현상/요구사항/피드백/기대결과 등)을 적어주세요."
              aria-label="내용"
            />
            {errors.content && <ErrorText>{errors.content}</ErrorText>}
          </Field>
        </Section>

        {statusMsg ? (
          <div style={{ marginTop: 12 }} role="status" aria-live="polite">
            <HelpText>{statusMsg}</HelpText>
          </div>
        ) : null}

        <Row style={{ marginTop: 18, justifyContent: 'flex-end' }}>
          <Button type="button" $variant="ghost" onClick={() => router.back()} disabled={submitting}>
            취소
          </Button>
          <Button type="button" $variant="primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? '처리 중…' : mode === 'create' ? '작성 완료' : '수정 저장'}
          </Button>
        </Row>
      </CardBody>
    </Card>
  );
}