// lib/styledComponentsRegistry.tsx
'use client';

import React, { useState } from 'react';
import { useServerInsertedHTML } from 'next/navigation';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';

export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  // 클라이언트에서는 StyleSheetManager가 없어도 됨(SSR에서만 필요)
  if (typeof window !== 'undefined') return <>{children}</>;

  return <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>;
}