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
  Row,
} from '../ui/Controls'; // 기존 Field, Input 등은 커스텀 스타일로 대체
import Link from 'next/link';
import ProcessTabs from '../ui/ProcessTabs';
import { formatKoreanDateTime, formatKoreanDateTimeRange } from '@/lib/utils/data';

// --- Styled Components ---

const PageContainer = styled.div`
  width: 100%;
  margin: 0;
  padding: 0;
  background-color: #F9FAFB; 
  min-height: 100vh;
  font-family: 'Paperlogy', -apple-system, BlinkMacSystemFont, system-ui, sans-serif !important;
  
  * {
    font-family: inherit;
  }
`;

const FlushHeader = styled.header`
  width: 100%;
  margin: 0;
  padding: 32px 5% 24px;
  background-color: #FFFFFF;
  border-bottom: 1px solid #E5E8EB; 
  box-sizing: border-box;
`;

const HeaderInner = styled.div`
  max-width: 1300px;
  margin: 0 auto;
`;

const HeaderTitle = styled.h1`
  font-size: 1.625rem;
  font-weight: 700;
  color: #191F28; 
  margin: 0 0 8px;
  letter-spacing: -0.02em;
`;

const HeaderSubTitle = styled.p`
  font-size: 0.9375rem;
  font-weight: 500;
  color: #8B95A1; 
  margin: 0;
`;

const ContentSection = styled.main`
  max-width: 1300px; 
  margin: 0 auto;
  padding: 24px 5% 64px;
  box-sizing: border-box;
`;

// --- Filter Style Components (Trendy & Modern) ---

const FilterCard = styled.div`
  background-color: #FFFFFF;
  border: 1px solid #F2F4F6;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

const FilterField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-size: 0.8125rem;
  color: #4E5968;
  font-weight: 600;
`;

const commonInputStyles = `
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #E5E8EB;
  background-color: #F9FAFB;
  font-size: 0.9375rem;
  color: #191F28;
  transition: all 0.2s ease;
  outline: none;
  box-sizing: border-box;

  &:hover {
    background-color: #F2F4F6;
  }

  &:focus {
    background-color: #FFFFFF;
    border-color: #3182F6;
    box-shadow: 0 0 0 3px rgba(49, 130, 246, 0.15);
  }
`;

const StyledInput = styled.input`
  ${commonInputStyles}
  &::placeholder {
    color: #8B95A1;
  }
`;

const StyledSelect = styled.select`
  ${commonInputStyles}
  appearance: none;
  cursor: pointer;
  /* 커스텀 화살표 SVG 삽입 */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238B95A1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px; /* 화살표 영역 확보 */
`;

const SectionTitle = styled.h2`
  font-size: 1.125rem;
  font-weight: 700;
  color: #191F28;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;

  span.count {
    color: #3182F6;
    font-size: 0.9375rem;
    font-weight: 600;
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px; 
`;

// --- Card Style Components (Instagram/Trendy Feed Vibe) ---

const CardLink = styled(Link)`
  display: flex;
  flex-direction: column;
  padding: 24px;
  background-color: #FFFFFF;
  border: 1px solid #F2F4F6;
  border-radius: 20px; 
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); 
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  gap: 16px;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
    border-color: #E5E8EB;
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ProfileBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E5E8EB 0%, #F2F4F6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #8B95A1;
  font-size: 0.9375rem;
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const AuthorName = styled.span`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #191F28;
`;

const CompanyName = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #8B95A1;
`;

const TimeMeta = styled.span`
  font-size: 0.8125rem;
  color: #AEB5BC;
  font-weight: 500;
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #191F28;
  line-height: 1.4;
  letter-spacing: -0.01em;
`;

const CardExcerpt = styled.p`
  margin: 0;
  color: #4E5968;
  font-size: 0.9375rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
  flex-wrap: wrap;
  gap: 12px;
`;

const TagGroup = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const ScheduleBadge = styled.div`
  display: inline-flex;
  align-items: center;
  background-color: #F0F6FF;
  color: #3182F6;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: -0.01em;
`;

// --- Helpers ---
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
        <HeaderInner>
          <HeaderTitle>접수대장</HeaderTitle>
          <HeaderSubTitle>공정별 개발진행 · 피드백 · 추가 요청</HeaderSubTitle>
        </HeaderInner>
      </FlushHeader>

      <ContentSection>
        {/* 모던하고 깔끔한 필터 섹션 */}
        <FilterCard>
          <div>
            <FilterLabel style={{ marginBottom: '12px', display: 'block' }}>공정 필터</FilterLabel>
            <ProcessTabs value={process} options={PROCESS_OPTIONS} onChange={setProcess} includeAll ariaLabel="공정 필터" />
          </div>

          <FilterGrid>
            <FilterField>
              <FilterLabel htmlFor="search">검색</FilterLabel>
              <StyledInput
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="작성자, 제목, 내용 검색"
                aria-label="작성자 제목 내용 검색"
              />
            </FilterField>

            <FilterField>
              <FilterLabel htmlFor="sort">정렬 기준</FilterLabel>
              <StyledSelect
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
              </StyledSelect>
            </FilterField>

            <FilterField>
              <FilterLabel htmlFor="category">항목 필터</FilterLabel>
              <StyledSelect
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as EntryCategory | 'ALL')}
                aria-label="항목 필터"
              >
                <option value="ALL">전체 보기</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </StyledSelect>
            </FilterField>

            <FilterField>
              <FilterLabel htmlFor="company">소속 필터</FilterLabel>
              <StyledSelect
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value as Company | 'ALL')}
                aria-label="소속 필터"
              >
                <option value="ALL">전체 보기</option>
                {COMPANY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </StyledSelect>
            </FilterField>
          </FilterGrid>
        </FilterCard>

        <div>
          <SectionTitle>
            접수 목록 <span className="count">{filteredSorted.length}</span>
          </SectionTitle>

          {loading ? (
            <SkeletonList aria-label="목록 로딩 중">
              {Array.from({ length: DEFAULT_PAGE_SIZE }).map((_, i) => (
                <div key={i} style={{ padding: '24px', borderRadius: '20px', border: '1px solid #F2F4F6', backgroundColor: '#FFFFFF', marginBottom: '16px' }}>
                  <Row style={{ marginBottom: '16px', gap: '10px' }}>
                    <SkeletonBlock $h={38} $w="38px" style={{ borderRadius: '50%' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <SkeletonBlock $h={16} $w="80px" />
                      <SkeletonBlock $h={12} $w="60px" />
                    </div>
                  </Row>
                  <SkeletonBlock $h={24} $w="70%" style={{ marginBottom: '12px' }} />
                  <SkeletonBlock $h={16} $w="100%" style={{ marginBottom: '6px' }} />
                  <SkeletonBlock $h={16} $w="50%" />
                </div>
              ))}
            </SkeletonList>
          ) : error ? (
            <EmptyState
              title="데이터를 불러오지 못했습니다"
              description={`에러: ${error}`}
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
                      <CardLink href={`/posts/${e.id}`} aria-label={`상세보기: ${e.title}`}>
                        
                        <CardHeader>
                          <ProfileBox>
                            <Avatar>
                              {e.authorName ? e.authorName.charAt(0) : '익'}
                            </Avatar>
                            <ProfileInfo>
                              <AuthorName>{e.authorName || '이름 없음'}</AuthorName>
                              <CompanyName>{COMPANY_LABEL[e.company]}</CompanyName>
                            </ProfileInfo>
                          </ProfileBox>
                          <TimeMeta>
                            {e.createdAt ? formatKoreanDateTime(e.createdAt) : '기록중…'}
                          </TimeMeta>
                        </CardHeader>

                        <CardBody>
                          <CardTitle>{e.title}</CardTitle>
                          <CardExcerpt>{e.content}</CardExcerpt>
                        </CardBody>

                        <CardFooter>
                          <TagGroup>
                            <Chip $tone={chipToneByCategory(e.category)}>{CATEGORY_LABEL[e.category]}</Chip>
                            <Chip>{e.process}</Chip>
                            {e.detail && <Chip>{e.detail}</Chip>}
                            {e.category === 'DEV' && devLabel && (
                              <Chip $tone={chipToneByDevStatusLabel(devLabel)}>{devLabel}</Chip>
                            )}
                          </TagGroup>

                          {e.category === 'DEV' && e.plannedStartAt && e.plannedEndAt && (
                            <ScheduleBadge>
                              🗓 {formatKoreanDateTimeRange(e.plannedStartAt, e.plannedEndAt)}
                            </ScheduleBadge>
                          )}
                        </CardFooter>

                      </CardLink>
                    </li>
                  );
                })}
              </List>

              <div style={{ marginTop: '24px' }}>
                <Pagination totalPages={totalPages} page={safePage} onChange={setPage} />
              </div>
            </>
          )}
        </div>
      </ContentSection>
    </PageContainer>
  );
}