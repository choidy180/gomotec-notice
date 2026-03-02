// styles/theme.ts
export const theme = {
  colors: {
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surface2: '#FBFCFD',
    text: '#111827',
    muted: '#6B7280',
    border: '#E5E7EB',
    primary: '#2563EB',
    primarySoft: '#EFF6FF',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    success: '#16A34A',
    successSoft: '#F0FDF4',
    warning: '#D97706',
    warningSoft: '#FFFBEB',
  },
  radius: {
    sm: '12px',
    md: '16px',
    lg: '20px',
    pill: '999px',
  },
  shadow: {
    sm: '0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)',
  },
  // ✅ 여백을 조금 키움(시인성/클릭 타겟)
  space: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '28px',
    xxl: '36px',
  },
  font: {
    base:
      '"Paperlogy", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif',
  },
  // ✅ 글자크기 확 키움(요청사항)
  fontSize: {
    xs: '14px',
    sm: '16px',
    md: '18px',
    lg: '20px',
    xl: '24px',
    xxl: '32px',
  },
  layout: {
    maxWidth: '1120px',
  },
} as const;

export type AppTheme = typeof theme;