// styles/GlobalStyle.ts
'use client';

import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }

  html, body { height: 100%; }

  body {
    margin: 0;
    font-family: ${({ theme }) => theme.font.base};
    background: ${({ theme }) => theme.colors.bg};
    color: ${({ theme }) => theme.colors.text};

    /* ✅ 기본 글자 크게 + 행간 넉넉히(가독성) */
    font-size: ${({ theme }) => theme.fontSize.md};
    line-height: 1.55;

    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a { color: inherit; text-decoration: none; }
  button, input, select, textarea { font-family: inherit; }

  :focus-visible {
    outline: 4px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
    border-radius: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
`;