// components/ui/Skeleton.tsx
'use client';

import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

export const SkeletonBlock = styled.div<{ $h?: number; $w?: string }>`
  height: ${({ $h }) => ($h ? `${$h}px` : '14px')};
  width: ${({ $w }) => $w ?? '100%'};
  border-radius: 10px;

  background: linear-gradient(
    90deg,
    rgba(229, 231, 235, 0.55) 25%,
    rgba(229, 231, 235, 0.9) 37%,
    rgba(229, 231, 235, 0.55) 63%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 1.2s ease infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const SkeletonList = styled.div`
  display: grid;
  gap: 10px;
`;