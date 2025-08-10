import { useState } from 'react';
import { ADMIN_NICKNAME, ADMIN_PASSWORD } from '../lib/admin';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function login(nickname: string, password: string) {
    if (nickname === ADMIN_NICKNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setError(null);
      return true;
    } else {
      setIsAdmin(false);
      setError('닉네임 또는 비밀번호가 올바르지 않습니다.');
      return false;
    }
  }

  function logout() {
    setIsAdmin(false);
    setError(null);
  }

  return { isAdmin, error, login, logout };
}
