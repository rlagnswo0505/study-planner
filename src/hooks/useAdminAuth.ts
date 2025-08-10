import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(nickname: string, password: string) {
    const { data, error } = await supabase.from('admins').select('*').eq('nickname', nickname).eq('password', password).single();
    if (error || !data) {
      setIsAdmin(false);
      setError('닉네임 또는 비밀번호가 올바르지 않습니다.');
      return false;
    } else {
      setIsAdmin(true);
      setError(null);
      return true;
    }
  }

  function logout() {
    setIsAdmin(false);
    setError(null);
  }

  return { isAdmin, error, login, logout };
}
