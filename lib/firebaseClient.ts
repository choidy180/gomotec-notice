// lib/firebaseClient.ts
'use client';

import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const ENV = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
} as const;

function assertRequiredEnv() {
  // ⚠️ 여기서도 “정적 값”만 체크 (동적 접근 금지)
  const missing: string[] = [];
  if (!ENV.apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!ENV.authDomain) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!ENV.projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!ENV.appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');

  if (missing.length) {
    throw new Error(
      `[Firebase] 환경 변수 누락: ${missing.join(
        ', '
      )}\n- .env.local 위치가 Next 프로젝트 루트인지 확인하고\n- 수정 후 dev 서버를 완전히 재시작하세요.`
    );
  }
}

// Firebase config 타입은 string을 기대하는데, optional 항목도 있어서 이렇게 구성
function getFirebaseConfig() {
  assertRequiredEnv();

  return {
    apiKey: ENV.apiKey!,
    authDomain: ENV.authDomain!,
    projectId: ENV.projectId!,
    appId: ENV.appId!,
    // 아래는 없어도 동작 가능
    storageBucket: ENV.storageBucket,
    messagingSenderId: ENV.messagingSenderId,
  };
}

// ✅ 싱글톤 캐시
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;

export function getFirebaseApp() {
  if (_app) return _app;

  const config = getFirebaseConfig();
  _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function getAuthClient() {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getDb() {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getStorageClient() {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
}