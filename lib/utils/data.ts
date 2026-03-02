// lib/utils/date.ts
import type { Timestamp } from 'firebase/firestore';

export function formatKoreanDateTime(ts: Timestamp | Date | null | undefined) {
  if (!ts) return '—';
  const date = ts instanceof Date ? ts : ts.toDate();

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatKoreanDateTimeRange(
  start: Timestamp | null | undefined,
  end: Timestamp | null | undefined
) {
  if (!start && !end) return '—';
  if (start && !end) return `${formatKoreanDateTime(start)} ~ (미정)`;
  if (!start && end) return `(미정) ~ ${formatKoreanDateTime(end)}`;
  return `${formatKoreanDateTime(start)} ~ ${formatKoreanDateTime(end)}`;
}