// lib/auth/AuthProvider.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';

import { getAuthClient } from '../firebaseClient';
import type { Company } from '../../types/entry';
import type { UserProfile } from '../../types/user';
import { getLoginIndexByName, subscribeMyProfile } from '../firebaseUsers';

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;

  loginOpen: boolean;
  redirectTo: string | null;

  openLogin: (opts?: { redirectTo?: string }) => void;
  closeLogin: () => void;

  requireAuth: (opts?: { redirectTo?: string }) => boolean;

  login: (params: { company: Company; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function friendlyError(e: unknown) {
  if (e instanceof FirebaseError) {
    if (e.code === 'permission-denied') return '권한 오류: Firestore Rules 설정을 확인해주세요.';
    if (e.code === 'auth/invalid-credential') return '이름/비밀번호가 올바르지 않습니다.';
    return e.message;
  }
  if (e instanceof Error) return e.message;
  return '알 수 없는 오류가 발생했습니다.';
}

async function clearAuthClientStorage() {
  if (typeof window === 'undefined') return;

  // ✅ 앱에서 저장한 값(있을 수도 있는) 정리 - 필요하면 prefix를 네 프로젝트에 맞게 바꿔도 됨
  try {
    const prefixes = ['gomotec', 'dev_board', 'board', 'auth'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k) continue;

      const isFirebaseKey = k.startsWith('firebase:') || k.startsWith('firebaseui::');
      const isAppKey = prefixes.some((p) => k.startsWith(p));

      if (isFirebaseKey || isAppKey) localStorage.removeItem(k);
    }
  } catch {}

  try {
    sessionStorage.clear();
  } catch {}

  // ✅ Firebase Auth persistence(DB) 강제 제거(베스트 에포트)
  // - internal 서비스라면 이 정도 “하드 리셋”이 계정 전환 버그를 가장 확실히 막음
  try {
    indexedDB.deleteDatabase('firebaseLocalStorageDb');
    indexedDB.deleteDatabase('firebase-installations-database');
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = getAuthClient();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [auth]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const unsubProfile = subscribeMyProfile(
      user.uid,
      (p) => setProfile(p),
      (e: any) => {
        // 🚨 기존 코드: console.error(e); 
        // 👇 아래와 같이 수정하세요! 👇
        if (e?.code === 'permission-denied') {
          // 계정 전환/로그아웃 시 0.1초 발생하는 자연스러운 현상이므로
          // 화면을 덮는 error 대신 조용히 넘어가도록 warn으로 바꿉니다.
          console.warn('프로필 구독 해제됨 (계정 전환 중)');
        } else {
          console.error('프로필 로드 에러:', e);
        }
        
        setProfile(null);
      }
    );

    return () => unsubProfile();
  }, [user]);

  const openLogin = (opts?: { redirectTo?: string }) => {
    setLoginOpen(true);
    setRedirectTo(opts?.redirectTo ?? null);
  };

  const closeLogin = () => {
    setLoginOpen(false);
    setRedirectTo(null);
  };

  const requireAuth = (opts?: { redirectTo?: string }) => {
    if (user) return true;
    openLogin({ redirectTo: opts?.redirectTo });
    return false;
  };

  /**
   * ✅ 계정 전환 로그인
   * - 현재 누가 로그인 돼 있든, 새 로그인 시도 전에 먼저 signOut
   * - 실패하면 예전 계정이 그대로 남는 현상을 제거
   */
  const login = async (params: { company: Company; name: string; password: string }) => {
    try {
      // 1) 기존 세션 정리(계정 전환)
      if (auth.currentUser) {
        await signOut(auth);
        // await clearAuthClientStorage();
      }

      // 2) 인덱스에서 email 찾기 (Firestore)
      const idx = await getLoginIndexByName(params.company, params.name);
      if (!idx?.email) throw new Error('해당 이름으로 가입된 계정을 찾을 수 없습니다.');

      // 3) Auth 로그인
      await signInWithEmailAndPassword(auth, idx.email, params.password);

      // 4) 로그인 모달 닫기
      setLoginOpen(false);
    } catch (e) {
      // 로그인 실패 시: 확실히 세션/상태를 정리해서 “이전 사용자 유지” 방지
      try {
        await signOut(auth);
      } catch {}
      // await clearAuthClientStorage();

      setUser(null);
      setProfile(null);

      throw new Error(friendlyError(e));
    }
  };

  /**
   * ✅ 하드 로그아웃: auth + 브라우저 저장소까지 정리
   */
  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      // await clearAuthClientStorage();
      setUser(null);
      setProfile(null);
      setLoginOpen(false);
      setRedirectTo(null);

      // “다 지워줘” 요구사항이면 새로고침이 제일 확실함
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      loginOpen,
      redirectTo,
      openLogin,
      closeLogin,
      requireAuth,
      login,
      logout,
    }),
    [user, profile, loading, loginOpen, redirectTo]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}