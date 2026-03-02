// app/page.tsx
import BoardPage from '@/components/board/BoardPage';
import AppShell from '../components/shell/AppShell';
import ErrorBoundary from '../components/ui/ErrorBoundary';

export default function Page() {
  return (
    <AppShell>
      <ErrorBoundary label="목록 화면에서 오류가 발생했습니다">
        <BoardPage />
      </ErrorBoundary>
    </AppShell>
  );
}