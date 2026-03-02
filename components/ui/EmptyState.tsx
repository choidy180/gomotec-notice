// components/ui/EmptyState.tsx
'use client';

import styled from 'styled-components';
import { Button, Row } from './Controls';

const Wrap = styled.div`
  padding: 26px;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface2};
`;

const Title = styled.h3`
  margin: 0 0 6px;
  font-size: ${({ theme }) => theme.fontSize.lg};
`;

const Desc = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.muted};
`;

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Wrap role="status" aria-live="polite">
      <Title>{title}</Title>
      <Desc>{description}</Desc>
      {actionLabel && onAction && (
        <Row style={{ marginTop: 12 }}>
          <Button type="button" onClick={onAction}>
            {actionLabel}
          </Button>
        </Row>
      )}
    </Wrap>
  );
}