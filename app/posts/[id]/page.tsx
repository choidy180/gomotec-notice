// app/posts/[id]/page.tsx
import AppShell from '../../../components/shell/AppShell';
import EntryDetailPage from '../../../components/board/EntryDetailPage';
import ErrorBoundary from '../../../components/ui/ErrorBoundary';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{ id?: string }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  if (!id) notFound();

  return (
    <AppShell>
      <ErrorBoundary label="상세 화면에서 오류가 발생했습니다">
        <EntryDetailPage id={id} />
      </ErrorBoundary>
    </AppShell>
  );
}