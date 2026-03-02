// components/board/NewEntryPage.tsx
'use client';

import { useEffect } from 'react';
import EntryForm from './EntryForm';
import EmptyState from '@/components/ui/EmptyState';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function NewEntryPage() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      auth.openLogin({ redirectTo: '/new' });
    }
  }, [auth]);

  if (auth.loading) {
    return (
      <EmptyState
        title="준비 중…"
        description="로그인 상태를 확인하고 있어요."
      />
    );
  }

  if (!auth.user) {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="글 작성은 로그인 후 가능합니다."
        actionLabel="로그인"
        onAction={() => auth.openLogin({ redirectTo: '/new' })}
      />
    );
  }

  return <EntryForm mode="create" />;
}