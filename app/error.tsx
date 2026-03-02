'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'inherit',
      }}
      role="alert"
      aria-live="polite"
    >
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>
        문제가 발생했어요
      </h1>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#6B7280', lineHeight: 1.6 }}>
        화면을 다시 시도하거나 홈으로 이동해 주세요.
      </p>

      <div style={{ marginTop: 18, padding: 14, border: '1px solid #E5E7EB', borderRadius: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 6 }}>에러 메시지</div>
        <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 14, color: '#111827' }}>
          {error?.message ?? 'Unknown error'}
        </pre>
        {error?.digest ? (
          <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>digest: {error.digest}</div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: '0',
            background: '#2563EB',
            color: 'white',
            fontWeight: 900,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          다시 시도
        </button>

        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #E5E7EB',
            background: 'white',
            color: '#111827',
            fontWeight: 900,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  );
}