// components/ui/OptionGridRadio.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

const Item = styled.button<{ $active?: boolean }>`
  min-height: 64px;
  padding: 14px 16px;
  border-radius: ${({ theme }) => theme.radius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 900;
  text-align: left;
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

export default function OptionGridRadio({
  value,
  options,
  onChange,
  ariaLabel,
  describedBy,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  ariaLabel: string;
  describedBy?: string;
}) {
  const activeIndex = useMemo(() => {
    const idx = options.findIndex((o) => o === value);
    return idx >= 0 ? idx : 0;
  }, [options, value]);

  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, options.length);
  }, [options.length]);

  const selectAt = (i: number) => {
    const next = options[i];
    if (!next) return;
    onChange(next);
    requestAnimationFrame(() => refs.current[i]?.focus?.());
  };

  if (options.length === 0) return null;

  return (
    <Grid role="radiogroup" aria-label={ariaLabel} aria-describedby={describedBy}>
      {options.map((o, i) => {
        const active = o === value;
        const tabIndex = value ? (active ? 0 : -1) : i === 0 ? 0 : -1;

        return (
          <Item
            key={o}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabIndex}
            $active={active}
            onClick={() => onChange(o)}
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
                onChange(o);
              }
            }}
            aria-label={`세부항목 선택: ${o}`}
          >
            {o}
          </Item>
        );
      })}
    </Grid>
  );
}