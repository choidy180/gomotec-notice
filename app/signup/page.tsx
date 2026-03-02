// app/signup/page.tsx
import AppShell from '../../components/shell/AppShell';
import ErrorBoundary from '../../components/ui/ErrorBoundary';
import SignupPage from '../../components/auth/SignupPage';

export default function Page() {
  return (
    <AppShell>
      <ErrorBoundary label="회원가입에서 오류가 발생했습니다">
        <SignupPage />
      </ErrorBoundary>
    </AppShell>
  );
}