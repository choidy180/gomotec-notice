// lib/utils/pagination.ts
export function getPaginationRange(params: {
  totalPages: number;
  currentPage: number;
  siblingCount?: number;
}) {
  const { totalPages, currentPage, siblingCount = 1 } = params;

  const range: Array<number | '...'> = [];
  if (totalPages <= 1) return [1];

  const clamp = (n: number) => Math.max(1, Math.min(totalPages, n));

  const left = clamp(currentPage - siblingCount);
  const right = clamp(currentPage + siblingCount);

  const showLeftDots = left > 2;
  const showRightDots = right < totalPages - 1;

  range.push(1);

  if (showLeftDots) range.push('...');
  for (let p = left; p <= right; p++) {
    if (p !== 1 && p !== totalPages) range.push(p);
  }
  if (showRightDots) range.push('...');

  if (totalPages !== 1) range.push(totalPages);

  // 중복 제거(케이스 처리)
  const dedup: Array<number | '...'> = [];
  for (const item of range) {
    if (dedup[dedup.length - 1] === item) continue;
    dedup.push(item);
  }
  return dedup;
}