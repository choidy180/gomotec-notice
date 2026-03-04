// components/board/BoardPage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { Company, Entry, EntryCategory, SortKey } from '../../types/entry';
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  COMPANY_LABEL,
  COMPANY_OPTIONS,
  DEFAULT_PAGE_SIZE,
  PROCESS_OPTIONS,
  REALTIME_LIMIT,
  SORT_OPTIONS,
} from '../../config/boardOptions';
import { subscribeEntries } from '../../lib/firebaseEntries';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import { SkeletonBlock, SkeletonList } from '../ui/Skeleton';
import {
  Chip,
  Field,
  FieldGrid,
  Input,
  Label,
  Row,
  Select,
} from '../ui/Controls';
import Link from 'next/link';
import ProcessTabs from '../ui/ProcessTabs';
import { formatKoreanDateTime, formatKoreanDateTimeRange } from '@/lib/utils/data';

// --- Styled Components (Apple-like Modern & Clean) ---

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  /* 애플 특유의 은은한 밝은 회색 배경 */
  background-color: #F5F5F7; 
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", sans-serif;
`;

const FlushHeader = styled.header`
  width: 100%;
  margin: 0;
  padding: 64px 5% 48px;
  background-color: #FFFFFF;
  /* 눈에 잘 띄면서도 정갈한 하단 선 */
  border-bottom: 1px solid #D2D2D7; 
  box-sizing: border-box;
`;

const HeaderTitle = styled.h1`
  font-size: 2.25rem;
  font-weight: 700;
  color: #1D1D1F; /* 애플의 묵직한 기본 텍스트 색상 */
  margin: 0 0 12px;
  letter-spacing: -0.03em;
`;

const HeaderSubTitle = styled.p`
  font-size: 1.0625rem;
  font-weight: 400;
  color: #86868B; /* 애플의 세련된 서브 텍스트 색상 */
  margin: 0;
  letter-spacing: -0.01em;
`;

const ContentSection = styled.main`
  max-width: 1200px;
  margin: 0 auto;
  padding: 56px 5%;
  box-sizing: border-box;
`;

const SectionTitle = styled.h2`
  font-size: 1.375rem;
  font-weight: 700;
  color: #1D1D1F;
  margin-bottom: 24px;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 8px;

  span.count {
    color: #86868B;
    font-size: 1.125rem;
    font-weight: 500;
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 20px; /* 카드 간 간격을 살짝 넓혀 여유롭게 */
`;

const ItemLink = styled(Link)`
  display: block;
  padding: 28px 32px;
  background-color: #FFFFFF;
  /* 선명하지만 얇고 고급스러운 애플 스타일 외곽선 */
  border: 1px solid #D2D2D7; 
  border-radius: 20px; /* 라운드를 살짝 더 주어 부드러운 인상 */
  transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  text-decoration: none;

  &:hover {
    border-color: #A1A1A6;
    /* 과하지 않고 은은하게 퍼지는 그림자 */
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.02);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
`;

const ItemTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const ItemTitle = styled.h3`
  margin: 0 0 10px;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1D1D1F;
  letter-spacing: -0.015em;
  line-height: 1.4;
`;

const ItemExcerpt = styled.p`
  margin: 0 0 20px;
  color: #4B5563;
  font-size: 0.9375rem;
  line-height: 1.6;
  
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemMeta = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
  color: #86868B;
  font-size: 0.875rem;
  font-weight: 500; /* 메타 데이터 가독성 강화 */

  span {
    display: inline-flex;
    align-items: center;
  }

  span:not(:last-child)::after {
    content: '';
    display: inline-block;
    width: 3px;
    height: 3px;
    background-color: #D2D2D7;
    border-radius: 50%;
    margin-left: 16px;
  }
`;

// --- Helpers ---
// (기존 헬퍼 함수 유지: chipToneByCategory, chipToneByDevStatusLabel, textIncludes, sortEntries)
function chipToneByCategory(category: EntryCategory) {
  if (category === 'DEV') return 'primary';
  if (category === 'FEEDBACK') return 'warning';
  return 'neutral';
}

function chipToneByDevStatusLabel(label?: string) {
  if (!label) return 'neutral';
  if (label.includes('완료')) return 'success';
  if (label.includes('진행')) return 'primary';
  return 'neutral';
}

function textIncludes(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function sortEntries(entries: Entry[], sortKey: SortKey) {
  const createdMillis = (e: Entry) => e.createdAt?.toMillis?.() ?? 0;
  const categoryOrder: EntryCategory[] = ['DEV', 'FEEDBACK', 'REQUEST'];
  const companyOrder: Company[] = ['DX_SOLUTION', 'GOMOTECH'];
  const categoryRank = (c: EntryCategory) => categoryOrder.indexOf(c);
  const companyRank = (c: Company) => companyOrder.indexOf(c);
  const arr = [...entries];

  if (sortKey === 'LATEST') {
    arr.sort((a, b) => createdMillis(b) - createdMillis(a));
    return arr;
  }
  if (sortKey === 'CATEGORY') {
    arr.sort((a, b) => {
      const r = categoryRank(a.category) - categoryRank(b.category);
      if (r !== 0) return r;
      return createdMillis(b) - createdMillis(a);
    });
    return arr;
  }
  arr.sort((a, b) => {
    const r = companyRank(a.company) - companyRank(b.company);
    if (r !== 0) return r;
    return createdMillis(b) - createdMillis(a);
  });
  return arr;
}

// --- Component ---

export default function BoardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('LATEST');
  const [category, setCategory] = useState<EntryCategory | 'ALL'>('ALL');
  const [company, setCompany] = useState<Company | 'ALL'>('ALL');
  const [process, setProcess] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsub = subscribeEntries(
      { max: REALTIME_LIMIT },
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      (e) => {
        console.error(e);
        setError(e.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [sortKey, category, company, process, search]);

  const filteredSorted = useMemo(() => {
    let arr = entries;
    if (category !== 'ALL') arr = arr.filter((e) => e.category === category);
    if (company !== 'ALL') arr = arr.filter((e) => e.company === company);
    if (process !== 'ALL') arr = arr.filter((e) => e.process === process);

    const q = search.trim();
    if (q) {
      arr = arr.filter((e) => {
        return (
          textIncludes(e.authorName ?? '', q) ||
          textIncludes(e.title ?? '', q) ||
          textIncludes(e.content ?? '', q)
        );
      });
    }

    return sortEntries(arr, sortKey);
  }, [entries, sortKey, category, company, process, search]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / DEFAULT_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * DEFAULT_PAGE_SIZE;
    return filteredSorted.slice(start, start + DEFAULT_PAGE_SIZE);
  }, [filteredSorted, safePage]);

  return (
    <PageContainer aria-label="개발관리 접수대장 목록">
      <FlushHeader>
        <HeaderTitle>접수대장</HeaderTitle>
        <HeaderSubTitle>
          공정별 개발진행/피드백/추가 요청을 기록하고 공유합니다. (실시간)
        </HeaderSubTitle>
      </FlushHeader>

      <ContentSection>
        <SectionTitle>필터 및 검색</SectionTitle>

        <FieldGrid style={{ marginBottom: '40px' }}>
          <Field>
            <Label htmlFor="sort">정렬</Label>
            <Select
              id="sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="정렬 기준"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label htmlFor="search">검색</Label>
            <Input
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="작성자 / 제목 / 내용 검색"
              aria-label="작성자 제목 내용 검색"
            />
          </Field>

          <Field>
            <Label htmlFor="category">항목</Label>
            <Select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as EntryCategory | 'ALL')}
              aria-label="항목 필터"
            >
              <option value="ALL">전체</option>
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label htmlFor="company">소속</Label>
            <Select
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value as Company | 'ALL')}
              aria-label="소속 필터"
            >
              <option value="ALL">전체</option>
              {COMPANY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGrid>

        <div style={{ marginBottom: '56px' }}>
          <Label style={{ marginBottom: '16px', display: 'block', fontWeight: 600 }}>공정</Label>
          <ProcessTabs value={process} options={PROCESS_OPTIONS} onChange={setProcess} includeAll ariaLabel="공정 필터" />
        </div>

        <div>
          <SectionTitle>
            접수 목록 <span className="count">({filteredSorted.length}건)</span>
          </SectionTitle>

          {loading ? (
            <SkeletonList aria-label="목록 로딩 중">
              {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
                <div key={i} style={{ padding: '28px 32px', borderRadius: '20px', border: '1px solid #D2D2D7', backgroundColor: '#FFFFFF' }}>
                  <Row style={{ marginBottom: '16px' }}>
                    <SkeletonBlock $h={28} $w="80px" />
                    <SkeletonBlock $h={28} $w="100px" />
                  </Row>
                  <SkeletonBlock $h={26} $w="60%" style={{ marginBottom: '14px' }} />
                  <SkeletonBlock $h={18} $w="100%" style={{ marginBottom: '8px' }} />
                  <SkeletonBlock $h={18} $w="80%" />
                </div>
              ))}
            </SkeletonList>
          ) : error ? (
            <EmptyState
              title="데이터를 불러오지 못했습니다"
              description={`네트워크 또는 서버 문제일 수 있습니다. 에러: ${error}`}
              actionLabel="새로고침"
              onAction={() => window.location.reload()}
            />
          ) : filteredSorted.length === 0 ? (
            <EmptyState
              title="표시할 접수 내역이 없습니다"
              description="검색 조건이나 필터를 변경해보시거나, 상단의 '새 글 작성' 버튼을 통해 등록해주세요."
            />
          ) : (
            <>
              <List aria-label="접수대장 목록">
                {paged.map((e) => {
                  const devLabel = e.devStatus
                    ? e.devStatus === 'DONE'
                      ? '개발완료'
                      : e.devStatus === 'IN_PROGRESS'
                        ? '개발진행중'
                        : '개발예정'
                    : null;

                  return (
                    <li key={e.id}>
                      <ItemLink href={`/posts/${e.id}`} aria-label={`상세보기: ${e.title}`}>
                        <ItemTop>
                          <Chip $tone={chipToneByCategory(e.category)}>{CATEGORY_LABEL[e.category]}</Chip>
                          <Chip>{e.process}</Chip>
                          <Chip>{e.detail}</Chip>
                          {e.category === 'DEV' && devLabel && (
                            <Chip $tone={chipToneByDevStatusLabel(devLabel)}>{devLabel}</Chip>
                          )}
                        </ItemTop>

                        <ItemTitle>{e.title}</ItemTitle>
                        <ItemExcerpt>{e.content}</ItemExcerpt>

                        <ItemMeta>
                          <span>
                            {COMPANY_LABEL[e.company]} {e.authorName}
                          </span>
                          <span>작성: {e.createdAt ? formatKoreanDateTime(e.createdAt) : '기록중…'}</span>
                          {e.category === 'DEV' && (
                            <span>예정: {formatKoreanDateTimeRange(e.plannedStartAt, e.plannedEndAt)}</span>
                          )}
                        </ItemMeta>
                      </ItemLink>
                    </li>
                  );
                })}
              </List>

              <div style={{ marginTop: '48px' }}>
                <Pagination totalPages={totalPages} page={safePage} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </ContentSection>
    </PageContainer>
  );
}