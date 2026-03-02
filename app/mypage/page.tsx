// app/mypage/page.tsx
import AppShell from '../../components/shell/AppShell';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import MyPage from '../../components/auth/MyPage';

export default function Page() {
  return (
    <AppShell>
      <ErrorBoundary label="마이페이지에서 오류가 발생했습니다">
        <MyPage />
      </ErrorBoundary>
    </AppShell>
  );
}