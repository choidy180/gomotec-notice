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
  Card,
  CardBody,
  CardHeader,
  Chip,
  Field,
  FieldGrid,
  H2,
  Input,
  Label,
  Row,
  Select,
  SubTitle,
  Title,
} from '../ui/Controls';
import Link from 'next/link';
import ProcessTabs from '../ui/ProcessTabs';
import { formatKoreanDateTime, formatKoreanDateTimeRange } from '@/lib/utils/data';

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 12px;
`;

const ItemLink = styled(Link)`
  display: block;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface};
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.surface2};
  }
  &:active {
    transform: translateY(1px);
  }
`;

const ItemTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`;

const ItemTitle = styled.h3`
  margin: 12px 0 0;
  font-size: ${({ theme }) => theme.fontSize.lg};
  letter-spacing: -0.02em;
`;

const ItemExcerpt = styled.p`
  margin: 8px 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.md};
  line-height: 1.6;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ItemMeta = styled.div`
  margin-top: 12px;
  color: ${({ theme }) => theme.colors.muted};
  font-size: ${({ theme }) => theme.fontSize.sm};
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`;

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
    <Card aria-label="개발관리 접수대장 목록">
      <CardHeader>
        <div>
          <Title>접수대장</Title>
          <SubTitle>공정별 개발진행/피드백/추가 요청을 기록하고 공유합니다. (실시간)</SubTitle>
        </div>
        {/* ✅ 새 글 작성 버튼은 상단 Nav(AppShell)만 사용 */}
      </CardHeader>

      <CardBody>
        <H2>필터 / 검색</H2>

        <FieldGrid>
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

        <div style={{ marginTop: 14 }}>
          <Label>공정</Label>
          <ProcessTabs value={process} options={PROCESS_OPTIONS} onChange={setProcess} includeAll ariaLabel="공정 필터" />
        </div>

        <div style={{ marginTop: 22 }}>
          <H2>
            목록 <span style={{ color: '#6B7280', fontSize: 16 }}>({filteredSorted.length}건)</span>
          </H2>

          {loading ? (
            <SkeletonList aria-label="목록 로딩 중">
              {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
                <div key={i} style={{ padding: 18, borderRadius: 20, border: '1px solid #E5E7EB' }}>
                  <Row>
                    <SkeletonBlock $h={26} $w="110px" />
                    <SkeletonBlock $h={26} $w="140px" />
                    <SkeletonBlock $h={26} $w="180px" />
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <SkeletonBlock $h={20} $w="70%" />
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <SkeletonBlock $h={16} $w="95%" />
                    <div style={{ height: 8 }} />
                    <SkeletonBlock $h={16} $w="78%" />
                  </div>
                </div>
              ))}
            </SkeletonList>
          ) : error ? (
            <EmptyState
              title="불러오기에 실패했어요"
              description={`Firebase/네트워크 문제일 수 있어요. 에러: ${error}`}
              actionLabel="새로고침"
              onAction={() => window.location.reload()}
            />
          ) : filteredSorted.length === 0 ? (
            <EmptyState
              title="표시할 글이 없어요"
              description="필터/검색 조건을 바꾸거나, 상단의 ‘새 글 작성’으로 등록해 주세요."
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
                            {COMPANY_LABEL[e.company]} · {e.authorName}
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

              <Pagination totalPages={totalPages} page={safePage} onChange={setPage} />
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}