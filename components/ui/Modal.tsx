// components/ui/Modal.tsx
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { Button, Row } from './Controls';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 1000;
`;

const Panel = styled.div`
  width: 100%;
  max-width: 520px;
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

const Header = styled.div`
  padding: 18px 18px 10px;
`;

const Body = styled.div`
  padding: 0 18px 18px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSize.xl};
`;

const Desc = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

function getFocusable(container: HTMLElement) {
  const selector =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
  footer,
  ariaLabelledbyId,
  ariaDescribedbyId,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  ariaLabelledbyId?: string;
  ariaDescribedbyId?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const portalTarget = useMemo(() => {
    if (typeof document === 'undefined') return null;
    return document.body;
  }, []);

  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement as HTMLElement | null;

    // 첫 포커스 이동
    const t = setTimeout(() => {
      if (!panelRef.current) return;
      const focusables = getFocusable(panelRef.current);
      (focusables[0] ?? panelRef.current).focus();
    }, 0);

    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!panelRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusables = getFocusable(panelRef.current);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (active === first || !panelRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    // 스크롤 잠금
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = original;
      // 포커스 복원
      lastFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open || !portalTarget) return null;

  const labelledby = ariaLabelledbyId ?? 'modal-title';
  const describedby = description ? ariaDescribedbyId ?? 'modal-desc' : undefined;

  return createPortal(
    <Backdrop
      role="presentation"
      onMouseDown={(e) => {
        // 배경 클릭 닫기(패널 클릭은 무시)
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Panel
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledby}
        aria-describedby={describedby}
        tabIndex={-1}
      >
        <Header>
          <Title id={labelledby}>{title}</Title>
          {description && <Desc id={describedby}>{description}</Desc>}
        </Header>
        <Body>
          {children}
          <Row style={{ marginTop: 14, justifyContent: 'flex-end' }}>
            {footer ?? (
              <>
                <Button type="button" $variant="ghost" onClick={onClose} aria-label="모달 닫기">
                  닫기
                </Button>
              </>
            )}
          </Row>
        </Body>
      </Panel>
    </Backdrop>,
    portalTarget
  );
}