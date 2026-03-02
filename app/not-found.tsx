// app/not-found.tsx
'use client';

import AppShell from '../components/shell/AppShell';
import { Card, CardBody, CardHeader, LinkButton, Title, SubTitle } from '../components/ui/Controls';

export default function NotFound() {
  return (
    <AppShell>
      <Card>
        <CardHeader>
          <div>
            <Title>페이지를 찾을 수 없어요</Title>
            <SubTitle>주소가 잘못되었거나, 삭제된 페이지일 수 있어요.</SubTitle>
          </div>
        </CardHeader>
        <CardBody>
          <LinkButton href="/" $variant="primary">
            목록으로 가기
          </LinkButton>
        </CardBody>
      </Card>
    </AppShell>
  );
}