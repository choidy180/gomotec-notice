// components/ui/ErrorBoundary.tsx
'use client';

import React from 'react';
import styled from 'styled-components';
import { Button } from './Controls';

const Wrap = styled.div`
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
`;

const Title = styled.h3`
  margin: 0 0 6px;
  font-size: ${({ theme }) => theme.fontSize.lg};
`;

const Desc = styled.p`
  margin: 0 0 12px;
  color: ${({ theme }) => theme.colors.muted};
`;

type Props = {
  children: React.ReactNode;
  label?: string;
};

type State = {
  hasError: boolean;
  message?: string;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error) {
    // 여기서 Sentry 같은 로깅 연동 가능
    console.error('[ErrorBoundary]', err);
  }

  reset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Wrap role="alert" aria-live="assertive">
        <Title>{this.props.label ?? '화면 표시 중 오류가 발생했습니다'}</Title>
        <Desc>
          {this.state.message
            ? `에러 메시지: ${this.state.message}`
            : '잠시 후 다시 시도해 주세요.'}
        </Desc>
        <Button type="button" onClick={this.reset}>
          다시 시도
        </Button>
      </Wrap>
    );
  }
}