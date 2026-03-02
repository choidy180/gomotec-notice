// app/new/page.tsx
import NewEntryPage from '@/components/board/NewEntryPage';
import AppShell from '../../components/shell/AppShell';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

export default function Page() {
  return (
    <AppShell>
      <ErrorBoundary label="새 글 작성에서 오류가 발생했습니다">
        <NewEntryPage />
      </ErrorBoundary>
    </AppShell>
  );
}