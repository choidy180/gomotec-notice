// app/account/page.tsx
import AppShell from '../../components/shell/AppShell';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import AccountRecoveryPage from '../../components/auth/AccountRecoveryPage';

export default function Page() {
  return (
    <AppShell>
      <ErrorBoundary label="비밀번호 재설정에서 오류가 발생했습니다">
        <AccountRecoveryPage />
      </ErrorBoundary>
    </AppShell>
  );
}