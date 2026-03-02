// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server';
import { getAdmin } from '../../../../lib/firebaseAdmin';
import type { Company } from '../../../../types/entry';
import { buildNameIndexId, isValidPhone, normalizeName, normalizePhone } from '../../../../lib/auth/identity';

const USERS = 'users';
const NAME_INDEX = 'user_index_by_name';
const AUDIT = 'dev_board_audit_logs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const company = body.company as Company;
    const name = normalizeName(String(body.name ?? ''));
    const phone = normalizePhone(String(body.phone ?? ''));
    const newPassword = String(body.newPassword ?? '');

    if (company !== 'GOMOTECH' && company !== 'DX_SOLUTION') {
      return NextResponse.json({ message: '소속 값이 올바르지 않습니다.' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ message: '이름이 필요합니다.' }, { status: 400 });
    if (!isValidPhone(phone)) {
      return NextResponse.json({ message: '연락처가 올바르지 않습니다.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ message: '비밀번호는 6자 이상을 권장합니다.' }, { status: 400 });
    }

    const { auth, db } = getAdmin();

    // 1) 이름 인덱스로 uid/email 찾기
    const idxId = buildNameIndexId(company, name);
    const idxSnap = await db.collection(NAME_INDEX).doc(idxId).get();
    if (!idxSnap.exists) {
      return NextResponse.json({ message: '계정을 찾을 수 없습니다. (이름/소속 확인)' }, { status: 404 });
    }
    const idx = idxSnap.data() as { uid: string; email: string; name: string; company: Company };

    // 2) users/{uid}에서 연락처 확인
    const userSnap = await db.collection(USERS).doc(idx.uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ message: '계정 프로필이 없습니다. 관리자에게 문의하세요.' }, { status: 404 });
    }
    const user = userSnap.data() as { phoneNormalized: string; company: Company; name: string };

    if (user.company !== company || user.name !== name || user.phoneNormalized !== phone) {
      return NextResponse.json({ message: '계정 확인에 실패했습니다. (연락처/이름 확인)' }, { status: 400 });
    }

    // 3) Firebase Auth 비밀번호 업데이트
    await auth.updateUser(idx.uid, { password: newPassword });

    // 4) 감사로그 기록(불변)
    await db.collection(AUDIT).add({
      targetType: 'USER',
      action: 'PASSWORD_RESET',
      uid: idx.uid,
      performedAt: new Date(),
      performedBy: { uid: idx.uid, company, name },
      before: null,
      after: null,
      changedKeys: ['password'],
      client: null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '서버 오류';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}