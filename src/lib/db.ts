import { supabase } from './supabaseClient';
import type { Participant, GiftRecord } from './types';

export async function fetchParticipants(weekKey: string) {
  const { data, error } = await supabase.from('participants').select('*').eq('weekKey', weekKey);
  if (error) throw error;
  return data as Participant[];
}

export async function saveParticipants(weekKey: string, participants: Participant[]) {
  // 기존 weekKey 데이터 삭제 후 insert
  await supabase.from('participants').delete().eq('weekKey', weekKey);
  const { error } = await supabase.from('participants').insert(participants.map((p) => ({ ...p, weekKey })));
  if (error) throw error;
}

export async function fetchGifts(weekKey: string) {
  const { data, error } = await supabase.from('gifts').select('*').eq('weekKey', weekKey);
  if (error) throw error;
  return data as GiftRecord[];
}

export async function saveGifts(weekKey: string, gifts: GiftRecord[]) {
  await supabase.from('gifts').delete().eq('weekKey', weekKey);
  const { error } = await supabase.from('gifts').insert(gifts.map((g) => ({ ...g, weekKey })));
  if (error) throw error;
}
