// components/ui/Pagination.tsx
'use client';

import styled from 'styled-components';
import { Button } from './Controls';
import { getPaginationRange } from '../../lib/utils/pagination';

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  flex-wrap: wrap;
`;

const PageBtn = styled(Button)<{ $active?: boolean }>`
  padding: 8px 10px;
  min-width: 40px;

  ${({ theme, $active }) =>
    $active
      ? `
    background: ${theme.colors.primarySoft};
    border-color: rgba(37, 99, 235, 0.25);
    color: ${theme.colors.primary};
  `
      : ''}
`;

const Ellipsis = styled.span`
  color: ${({ theme }) => theme.colors.muted};
  padding: 0 6px;
`;

export default function Pagination({
  totalPages,
  page,
  onChange,
}: {
  totalPages: number;
  page: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const range = getPaginationRange({ totalPages, currentPage: page, siblingCount: 1 });

  return (
    <Nav aria-label="페이지네이션">
      <PageBtn
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        이전
      </PageBtn>

      {range.map((item, idx) => {
        if (item === '...') return <Ellipsis key={`e-${idx}`}>…</Ellipsis>;

        const p = item;
        return (
          <PageBtn
            key={p}
            type="button"
            $active={p === page}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`${p} 페이지`}
          >
            {p}
          </PageBtn>
        );
      })}

      <PageBtn
        type="button"
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        다음
      </PageBtn>
    </Nav>
  );
}