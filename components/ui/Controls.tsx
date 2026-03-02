// components/ui/Controls.tsx
'use client';

import styled, { css } from 'styled-components';
import Link from 'next/link';

export const Container = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.maxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => theme.space.xl};
`;

export const Card = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

export const CardHeader = styled.div`
  padding: ${({ theme }) => theme.space.xl};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.lg};
`;

export const CardBody = styled.div`
  padding: ${({ theme }) => theme.space.xl};
`;

export const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSize.xxl};
  letter-spacing: -0.02em;
  line-height: 1.15;
`;

export const SubTitle = styled.p`
  margin: ${({ theme }) => theme.space.xs} 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

export const H2 = styled.h2`
  margin: 0 0 ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.fontSize.xl};
  line-height: 1.2;
`;

export const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  flex-wrap: wrap;
`;

export const Spacer = styled.div`
  height: ${({ theme }) => theme.space.lg};
`;

export const Divider = styled.hr`
  border: 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  margin: ${({ theme }) => theme.space.xl} 0;
`;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;

  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 18px; /* ✅ 크게 */
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: 900;

  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;

  transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease;

  &:active {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const Button = styled.button<{ $variant?: ButtonVariant }>`
  ${buttonBase};

  ${({ theme, $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.primary};
          color: white;
          border-color: ${theme.colors.primary};
          &:hover {
            filter: brightness(0.98);
          }
        `;
      case 'danger':
        return css`
          background: ${theme.colors.danger};
          color: white;
          border-color: ${theme.colors.danger};
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.text};
          border-color: ${theme.colors.border};
          &:hover {
            background: ${theme.colors.surface2};
          }
        `;
      default:
        return css`
          background: ${theme.colors.surface};
          color: ${theme.colors.text};
          border-color: ${theme.colors.border};
          &:hover {
            background: ${theme.colors.surface2};
          }
        `;
    }
  }}
`;

export const LinkButton = styled(Link)<{ $variant?: ButtonVariant }>`
  ${buttonBase};
  text-decoration: none;

  ${({ theme, $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: ${theme.colors.primary};
          color: white;
          border-color: ${theme.colors.primary};
        `;
      case 'ghost':
        return css`
          background: transparent;
          color: ${theme.colors.text};
          border-color: ${theme.colors.border};
          &:hover {
            background: ${theme.colors.surface2};
          }
        `;
      default:
        return css`
          background: ${theme.colors.surface};
          color: ${theme.colors.text};
          border-color: ${theme.colors.border};
        `;
    }
  }}
`;

export const Label = styled.label`
  display: block;
  font-weight: 900;
  font-size: ${({ theme }) => theme.fontSize.md}; /* ✅ 크게 */
  margin-bottom: 10px;
`;

export const HelpText = styled.p`
  margin: 8px 0 0;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.muted};
`;

export const ErrorText = styled.p`
  margin: 8px 0 0;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.colors.danger};
  font-weight: 800;
`;

const controlBase = css`
  width: 100%;
  min-height: 56px; /* ✅ 클릭/터치 타겟 크게 */
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: 14px 14px; /* ✅ 크게 */
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.3;

  &:focus-visible {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Input = styled.input`
  ${controlBase};
`;

export const Select = styled.select`
  ${controlBase};
`;

export const Textarea = styled.textarea`
  ${controlBase};
  min-height: 220px; /* ✅ 더 크게 */
  resize: vertical;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.xl};

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const Field = styled.div`
  min-width: 0;
`;

type ChipTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning';

export const Chip = styled.span<{ $tone?: ChipTone }>`
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 900;
  border: 1px solid ${({ theme }) => theme.colors.border};

  ${({ theme, $tone = 'neutral' }) => {
    switch ($tone) {
      case 'primary':
        return css`
          background: ${theme.colors.primarySoft};
          color: ${theme.colors.primary};
          border-color: rgba(37, 99, 235, 0.25);
        `;
      case 'success':
        return css`
          background: ${theme.colors.successSoft};
          color: ${theme.colors.success};
          border-color: rgba(22, 163, 74, 0.25);
        `;
      case 'danger':
        return css`
          background: ${theme.colors.dangerSoft};
          color: ${theme.colors.danger};
          border-color: rgba(220, 38, 38, 0.25);
        `;
      case 'warning':
        return css`
          background: ${theme.colors.warningSoft};
          color: ${theme.colors.warning};
          border-color: rgba(217, 119, 6, 0.25);
        `;
      default:
        return css`
          background: ${theme.colors.surface2};
          color: ${theme.colors.text};
        `;
    }
  }}
`;

export const InlineCode = styled.code`
  background: ${({ theme }) => theme.colors.surface2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 0.95em;
`;