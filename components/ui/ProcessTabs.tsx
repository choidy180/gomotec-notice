// components/ui/ProcessTabs.tsx
'use client';

import { useEffect, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';

const Nav = styled.nav`
  margin-top: 10px;
`;

const Group = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  padding: 10px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const ItemButton = styled.button<{ $active?: boolean }>`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 800;
  font-size: ${({ theme }) => theme.fontSize.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
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

type Option = { value: string; label: string };

export default function ProcessTabs({
  value,
  options,
  onChange,
  includeAll = true,
  ariaLabel = '공정 필터',
}: {
  value: string; // 'ALL' 또는 공정명
  options: readonly string[];
  onChange: (next: string) => void;
  includeAll?: boolean;
  ariaLabel?: string;
}) {
  const opts = useMemo<Option[]>(() => {
    const list = options.map((o) => ({ value: o, label: o }));
    return includeAll ? [{ value: 'ALL', label: '전체' }, ...list] : list;
  }, [options, includeAll]);

  const selectedIndex = Math.max(
    0,
    opts.findIndex((o) => o.value === value)
  );

  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    refs.current = refs.current.slice(0, opts.length);
  }, [opts.length]);

  const focusAt = (i: number) => refs.current[i]?.focus?.();

  const selectAt = (i: number) => {
    const next = opts[i];
    if (!next) return;
    onChange(next.value);
    requestAnimationFrame(() => focusAt(i));
  };

  return (
    <Nav aria-label={ariaLabel}>
      <Group role="radiogroup" aria-label="공정 선택">
        {opts.map((o, i) => {
          const active = o.value === value;

          return (
            <ItemButton
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              $active={active}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') {
                  e.preventDefault();
                  selectAt((i + 1) % opts.length);
                }
                if (e.key === 'ArrowLeft') {
                  e.preventDefault();
                  selectAt((i - 1 + opts.length) % opts.length);
                }
                if (e.key === 'Home') {
                  e.preventDefault();
                  selectAt(0);
                }
                if (e.key === 'End') {
                  e.preventDefault();
                  selectAt(opts.length - 1);
                }
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange(o.value);
                }
              }}
              aria-label={`공정 선택: ${o.label}`}
            >
              {o.label}
            </ItemButton>
          );
        })}
      </Group>
    </Nav>
  );
}