import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const ADMIN_SESSION_KEY = 'admin_session';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 컴포넌트 마운트 시 세션 스토리지에서 로그인 상태 복원
  useEffect(() => {
    const storedSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (storedSession) {
      try {
        const sessionData = JSON.parse(storedSession);
        if (sessionData.isAdmin && sessionData.nickname) {
          setIsAdmin(true);
        }
      } catch {
        // 세션 데이터가 손상된 경우 제거
        sessionStorage.removeItem(ADMIN_SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  async function login(nickname: string, password: string) {
    const { data, error } = await supabase.from('admins').select('*').eq('nickname', nickname).eq('password', password).single();
    if (error || !data) {
      setIsAdmin(false);
      setError('닉네임 또는 비밀번호가 올바르지 않습니다.');
      // 실패한 로그인 세션 정보 제거
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      return false;
    } else {
      setIsAdmin(true);
      setError(null);
      // 로그인 성공 시 세션 스토리지에 저장
      sessionStorage.setItem(
        ADMIN_SESSION_KEY,
        JSON.stringify({
          isAdmin: true,
          nickname: nickname,
          loginTime: new Date().toISOString(),
        })
      );
      return true;
    }
  }

  function logout() {
    setIsAdmin(false);
    setError(null);
    // 로그아웃 시 세션 스토리지에서 제거
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }

  return { isAdmin, error, login, logout, isLoading };
}
