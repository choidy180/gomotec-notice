import type { Metadata } from 'next';
import StyledComponentsRegistry from '../lib/styledComponentsRegistry';
import Providers from '../components/providers/Providers';

export const metadata: Metadata = {
  title: '스마트공장 접수대장',
  description: '개발진행 / 피드백 / 추가요청 공유 게시판',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <StyledComponentsRegistry>
          {/* ✅ 여기서 전체 앱을 Provider로 감싸야 함 */}
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}