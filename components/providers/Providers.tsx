'use client';

import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import { GlobalStyle } from '../../styles/GlobalStyle';

// ✅ 반드시 이 경로로 통일 (useAuth도 같은 파일에서 가져와야 함)
import { AuthProvider } from '../../lib/auth/AuthProvider';
import AuthModal from '@/lib/auth/AuthModal';


export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <AuthProvider>
        {children}
        {/* ✅ 로그인 모달은 루트에 1번만 */}
        <AuthModal />
      </AuthProvider>
    </ThemeProvider>
  );
}