// lib/firebaseAdmin.ts
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getPrivateKey() {
  const key = process.env.FIREBASE_ADMIN_PRIVATE_KEY ?? '';
  // .env에 \n 형태로 들어간 것을 실제 줄바꿈으로 복원
  return key.replace(/\\n/g, '\n');
}

export function getAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin 환경변수가 없습니다. ' +
          'FIREBASE_ADMIN_PROJECT_ID / FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_ADMIN_PRIVATE_KEY 를 설정하세요.'
      );
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
  };
}