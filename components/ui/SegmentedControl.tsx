// components/ui/SegmentedControl.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';

type Option = { value: string; label: string };

const Wrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

const SegBtn = styled.button<{ $active?: boolean }>`
  flex: 1 1 160px;
  min-height: 56px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 900;
  cursor: pointer;

  transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

  &:active {
    transform: translateY(1px);
  }

  ${({ theme, $active }) =>
    $active &&
    css`
      background: ${theme.colors.primarySoft};
      border-color: rgba(37, 99, 235, 0.28);
      color: ${theme.colors.primary};
    `}
`;

export default function SegmentedControl({
  value,
  options,
  onChange,
  ariaLabel,
  describedBy,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  ariaLabel: string;
  describedBy?: string;
}) {
  const activeIndex = useMemo(() => {
    const idx = options.findIndex((o) => o.value === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, options.length);
  }, [options.length]);

  const selectAt = (i: number) => {
    const next = options[i];
    if (!next) return;
    onChange(next.value);
    requestAnimationFrame(() => refs.current[i]?.focus?.());
  };

  return (
    <Wrap role="radiogroup" aria-label={ariaLabel} aria-describedby={describedBy}>
      {options.map((o, i) => {
        const active = o.value === value;

        // 아무것도 선택 안 된 상태면 첫번째 버튼에 포커스 가능하게
        const tabIndex = value ? (active ? 0 : -1) : i === 0 ? 0 : -1;

        return (
          <SegBtn
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabIndex}
            $active={active}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') {
                e.preventDefault();
                selectAt((i + 1) % options.length);
              }
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                selectAt((i - 1 + options.length) % options.length);
              }
              if (e.key === 'Home') {
                e.preventDefault();
                selectAt(0);
              }
              if (e.key === 'End') {
                e.preventDefault();
                selectAt(options.length - 1);
              }
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(o.value);
              }
            }}
          >
            {o.label}
          </SegBtn>
        );
      })}
    </Wrap>
  );
}