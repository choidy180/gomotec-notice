'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { getAuthClient } from '../../lib/firebaseClient';
import type { Company } from '../../types/entry';
import type { UserProfile } from '../../types/user';
import { getLoginIndexByName, subscribeMyProfile } from '../../lib/firebaseUsers';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  /**
   * ✅ 중요: auth 인스턴스를 렌더마다 새로 만들지 않도록 고정
   * (getAuth() 자체는 보통 싱글톤이지만, 안전하게 1번만 생성)
   */
  const auth = useMemo(() => getAuthClient(), []);

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [loginOpen, setLoginOpen] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  // ✅ 로그인 모달 열기/닫기: useCallback으로 고정
  const openLogin = useCallback((opts?: { redirectTo?: string }) => {
    setLoginOpen(true);
    setRedirectTo(opts?.redirectTo ?? null);
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOpen(false);
    setRedirectTo(null);
  }, []);

  // ✅ 로그인 필요 액션 가드
  const requireAuth = useCallback(
    (opts?: { redirectTo?: string }) => {
      if (user) return true;
      openLogin({ redirectTo: opts?.redirectTo });
      return false;
    },
    [user, openLogin]
  );

  // ✅ Firebase Auth 구독
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return () => unsubAuth();
  }, [auth]);

  // ✅ 내 프로필 구독 (Firestore)
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const unsubProfile = subscribeMyProfile(
      user.uid,
      (p) => setProfile(p),
      (e) => {
        console.error(e);
        setProfile(null);
      }
    );

    return () => unsubProfile();
  }, [user, subscribeMyProfile]);

  // ✅ 로그인
  const login = useCallback(
    async (params: { company: Company; name: string; password: string }) => {
      const idx = await getLoginIndexByName(params.company, params.name);
      if (!idx) throw new Error('해당 이름으로 가입된 계정을 찾을 수 없습니다.');

      await signInWithEmailAndPassword(auth, idx.email, params.password);
    },
    [auth, getLoginIndexByName]
  );

  // ✅ 로그아웃
  const logout = useCallback(async () => {
    await signOut(auth);
  }, [auth]);

  // ✅ Context value도 deps 완전하게!
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
    [
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
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}