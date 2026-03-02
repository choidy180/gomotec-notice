// components/ui/Avatar.tsx
'use client';

import styled from 'styled-components';

function hashToHue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) % 360;
  }
  return h;
}

function gradientFromSeed(seed: string) {
  const h1 = hashToHue(seed);
  const h2 = (h1 + 60) % 360;
  const c1 = `hsl(${h1} 85% 60%)`;
  const c2 = `hsl(${h2} 85% 55%)`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

const Wrap = styled.div<{ $size: number; $bg: string }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 999px;
  overflow: hidden;
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: white;
  user-select: none;
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export default function Avatar({
  size = 44,
  name,
  seed,
  photoURL,
  ariaLabel,
}: {
  size?: number;
  name: string;
  seed: string;
  photoURL?: string | null;
  ariaLabel?: string;
}) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase();
  const bg = gradientFromSeed(seed);

  return (
    <Wrap $size={size} $bg={bg} role="img" aria-label={ariaLabel ?? `프로필: ${name}`}>
      {photoURL ? <Img src={photoURL} alt="" /> : <span aria-hidden="true">{initial}</span>}
    </Wrap>
  );
}