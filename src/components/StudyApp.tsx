import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarDays, Coffee, RefreshCw, Sheet, Trophy } from 'lucide-react';
// import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabaseClient';
import { useAdminAuth } from '../hooks/useAdminAuth';
// Supabase admins 테이블 연동 운영자 로그인 훅
import type { Participant } from '../lib/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table } from './ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
// dayjs 설치 필요: npm install dayjs @types/dayjs
import dayjs from 'dayjs';

const HOUR_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5); // 5..50
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// Sunday-based week key for auto-reset
// 월요일 기준 weekKey
function thisWeekKey(d: Date = new Date()) {
  const date = dayjs(d);
  const year = date.year();
  const start = dayjs(new Date(year, 0, 1));
  // 월요일 기준: start.day()가 1(월)일 때 0, 0(일)일 때 6
  const monOffset = (start.day() + 6) % 7;
  const days = date.diff(start, 'day');
  const week = Math.floor((monOffset + days) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
}

// Monday-first week-of-month label: "8월 3주차"
function koreanWeekOfMonthLabel(d: Date = new Date()) {
  const date = dayjs(d);
  const year = date.year();
  const month = date.month(); // 0-indexed
  const day = date.date();
  const first = dayjs(new Date(year, month, 1));
  const monIndex = (first.day() + 6) % 7; // Monday=0..Sunday=6
  const week = Math.floor((monIndex + day - 1) / 7) + 1;
  return `${month + 1}월 ${week}주차`;
}

// Monday-first index of today: 0..6
function todayMonIndex(d: Date = new Date()) {
  const date = dayjs(d);
  return (date.day() + 6) % 7;
}

function sumHours(p: Participant) {
  if (p.dailyHours && Array.isArray(p.dailyHours) && p.dailyHours.length === 7) {
    return p.dailyHours.reduce((a, b) => a + b, 0);
  }
  return p.studiedHours || 0;
}

export default function StudyApp() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  const weekKey = useMemo(() => thisWeekKey(), []);
  const weekLabel = koreanWeekOfMonthLabel();
  const { isAdmin, error: adminError, login, logout, isLoading: adminLoading } = useAdminAuth();
  const [adminNick, setAdminNick] = useState('');
  const [adminPw, setAdminPw] = useState('');

  // DB에서 participants 불러오기
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const pRes = await supabase.from('participants').select('*').eq('weekKey', weekKey);
        setParticipants(Array.isArray(pRes.data) ? pRes.data : []);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [weekKey]);

  // Form states
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>('');

  const [logName, setLogName] = useState('');
  const [logHours, setLogHours] = useState<number | ''>('');
  const [logComment, setLogComment] = useState('');

  const achieved = useMemo(
    () =>
      participants
        .map((p) => {
          const total = sumHours(p);
          return {
            ...p,
            studiedHours: total,
            achieved: p.goalHours != null && total >= p.goalHours,
          };
        })
        .sort((a, b) => (b.goalHours ?? 0) - (a.goalHours ?? 0)),
    [participants]
  );
  const achievers = achieved.filter((p) => p.achieved);
  const nonAchievers = achieved.filter((p) => !p.achieved);

  function ensureDaily(p?: Participant) {
    return p?.dailyHours && p.dailyHours.length === 7 ? p.dailyHours : [0, 0, 0, 0, 0, 0, 0];
  }

  async function upsertParticipant(p: Participant) {
    setLoading(true);
    // upsert: name+weekKey 기준으로 덮어쓰기
    const { error } = await supabase.from('participants').upsert([{ ...p, weekKey, dailyHours: ensureDaily(p) }], { onConflict: 'name,weekKey' });
    if (!error) {
      // 최신 데이터 다시 불러오기
      const { data } = await supabase.from('participants').select('*').eq('weekKey', weekKey);
      setParticipants(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  async function handleVote() {
    const trimmed = name.trim();
    if (!trimmed || !goal) {
      alert('닉네임과 목표 시간을 입력해 주세요.');
      return;
    }
    const existing = participants.find((p) => p.name === trimmed);
    await upsertParticipant({
      id: existing?.id ?? crypto.randomUUID(),
      name: trimmed,
      goalHours: parseInt(goal),
      studiedHours: sumHours(existing || { studiedHours: 0, id: '', name: '', comments: [], dailyHours: [0, 0, 0, 0, 0, 0, 0] }),
      comments: existing?.comments ?? [],
      dailyHours: ensureDaily(existing),
    });
    setName('');
    setGoal('');
  }

  async function handleLog() {
    const trimmed = logName.trim();
    const who = participants.find((p) => p.name.trim() === trimmed);
    if (!who) {
      alert('먼저 목표를 등록해 주세요.');
      return;
    }
    const hours = typeof logHours === 'number' ? logHours : parseInt(String(logHours || 0), 10);
    if (!hours || hours <= 0) {
      alert('공부한 시간을 올바르게 입력해 주세요.');
      return;
    }
    const dayIdx = todayMonIndex();
    const daily = ensureDaily(who).slice();
    if (daily[dayIdx] && daily[dayIdx] > 0) {
      const confirmMsg = `이미 오늘(${DAY_LABELS[dayIdx]})에 ${daily[dayIdx]}시간이 기록되어 있습니다. 추가로 ${hours}시간을 더하시겠습니까?`;
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }
    daily[dayIdx] = (daily[dayIdx] || 0) + hours;
    const total = daily.reduce((a, b) => a + b, 0);
    await upsertParticipant({
      ...who,
      dailyHours: daily,
      studiedHours: total,
      comments: logComment ? [...who.comments, logComment] : who.comments,
    });
    setLogHours('');
    setLogComment('');
  }

  async function handleResetAll() {
    if (!isAdmin) return;
    if (!window.confirm('정말로 이번 주 모든 참여자 기록을 초기화하시겠습니까?')) return;
    setLoading(true);
    await supabase.from('participants').delete().eq('weekKey', weekKey);
    setParticipants([]);
    setLoading(false);
  }

  const hourItems = HOUR_OPTIONS.map((h) => (
    <SelectItem key={h} value={String(h)}>
      {h}시간
    </SelectItem>
  ));

  return (
    <div className="space-y-6">
      {/* 운영자 로그인 UI */}
      <div className="flex justify-end gap-2 items-center mb-2">
        {isAdmin ? (
          <>
            <span className="text-green-600 font-bold">운영자 모드</span>
            <Button size="sm" variant="outline" onClick={logout}>
              로그아웃
            </Button>
          </>
        ) : (
          <>
            <Input style={{ maxWidth: 120 }} placeholder="운영자 닉네임" value={adminNick} onChange={(e) => setAdminNick(e.target.value)} />
            <Input style={{ maxWidth: 100 }} type="password" placeholder="비밀번호" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => login(adminNick, adminPw)}>
              로그인
            </Button>
            {adminError && <span className="text-red-500 text-xs ml-2">{adminError}</span>}
          </>
        )}
      </div>
      <header
        className="flex items-center justify-between gap-3
      flex-col md:flex-row
      "
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2">
            <BookOpenText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">매주 목표달성</h1>
            <p className="text-sm text-muted-foreground">함께 목표를 공유하고 체크하며 동기부여를 얻어요.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={'outline'} className="py-2 rounded-full">
            <CalendarDays className="size-4 text-amber-600" />
            <span className="whitespace-nowrap">{weekLabel}</span>
          </Badge>
          {isAdmin && (
            <Button asChild className="bg-amber-500 hover:bg-amber-600">
              <a href="/stats" style={{ textDecoration: 'none' }}>
                <Sheet />
                통계페이지
              </a>
            </Button>
          )}
        </div>
      </header>

      {isAdmin && (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>목표 시간 입력 (운영자만 가능)</CardTitle>
            <CardDescription>이번 주 목표 시간을 5시간 단위로 선택하세요. 등록 후 변경 불가.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor="vote-name">닉네임</Label>
                <Input id="vote-name" className="mt-1" placeholder="닉네임 입력" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="sm:col-span-1">
                <Label htmlFor="vote-goal">목표시간</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v ? v : '')}>
                  <SelectTrigger className="w-full mt-1">
                    <SelectValue placeholder="5 ~ 50시간" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>목표시간</SelectLabel>
                      {hourItems}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button className="w-full bg-[#838de5] hover:bg-[#6f7dff]" onClick={handleVote}>
                  목표 등록
                </Button>
              </div>
              <p className="sm:col-span-3 text-xs text-muted-foreground">오프라인 스터디 시간만 인정됩니다. 1인 스터디의 경우 타임스탬프 등으로 인증해 주세요.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>공부 시간 기록</CardTitle>
          <CardDescription>오늘 공부한 시간을 기록하면, 해당 요일 칸에 자동으로 누적됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Label htmlFor="log-name">닉네임</Label>
              <Select value={logName} onValueChange={(v) => setLogName(v)}>
                <SelectTrigger id="log-name" className="w-full mt-1">
                  <SelectValue placeholder="닉네임 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>닉네임</SelectLabel>
                    {participants.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Label htmlFor="log-hours">공부시간(+)</Label>
              <Select value={logHours === '' ? '' : String(logHours)} onValueChange={(v) => setLogHours(v === '' ? '' : Number(v))}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="공부시간 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>공부시간</SelectLabel>
                    {[...Array(24)].map((_, i) => {
                      const val = 0.5 + i * 0.5;
                      return (
                        <SelectItem key={val} value={String(val)}>
                          {val % 1 === 0 ? `${val}시간` : `${Math.floor(val)}시간 30분`}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="log-comment">댓글/인증(선택)</Label>
              <Input id="log-comment" className="mt-1" placeholder="예: 8/8 오프라인 스터디 3시간" value={logComment} onChange={(e) => setLogComment(e.target.value)} />
            </div>
            <div className="sm:col-span-4">
              <Button className="w-full sm:w-auto bg-[#838de5] hover:bg-[#6f7dff]" onClick={handleLog}>
                기록하기 (오늘: {DAY_LABELS[todayMonIndex()]})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-start gap-2">
            <CardTitle>달성 현황 (요일별)</CardTitle>
            <CardDescription>요일별 누적과 총합을 확인하세요.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full">
              <Trophy className="size-3.5 text-amber-500" />
              <span className="ml-1">달성 {achievers.length}</span>
            </Badge>
            <Badge variant="outline" className="rounded-full">
              <Coffee className="size-3.5 text-emerald-600" />
              <span className="ml-1">미달성 {nonAchievers.length}</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading || adminLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span className="text-indigo-500 font-medium text-lg">데이터를 불러오는 중...</span>
            </div>
          ) : (
            <Table className="bg-white rounded-lg">
              <thead className="border-b">
                <tr className="hover:bg-muted/50 transition-colors">
                  <th className="whitespace-nowrap">닉네임</th>
                  {DAY_LABELS.map((d) => (
                    <th key={d} className={`text-center py-4 px-2 whitespace-nowrap ${d === '토' ? 'text-blue-400' : d === '일' ? 'text-red-400' : ''}`}>
                      {d}
                    </th>
                  ))}
                  <th className="text-right p-4 whitespace-nowrap">목표</th>
                  <th className="text-right p-4 whitespace-nowrap">공부</th>
                  <th className="text-center whitespace-nowrap p-4">달성여부</th>
                </tr>
              </thead>
              <tbody>
                {achieved.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="text-center text-sm text-muted-foreground p-4 bg-muted font-bold
                    rounded-b-lg
                  "
                    >
                      아직 참여자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  achieved.map((p) => {
                    const daily = p.dailyHours && p.dailyHours.length === 7 ? p.dailyHours : [0, 0, 0, 0, 0, 0, 0];
                    const total = sumHours(p);
                    return (
                      <tr key={p.name} className="font-bold hover:bg-muted/50 transition-colors">
                        <td
                          className="p-4 whitespace-nowrap
                      "
                        >
                          {p.name}
                        </td>
                        {daily.map((h, i) => (
                          <td key={i} className="py-4 px-2 text-center tabular-nums">
                            {h || 0}
                          </td>
                        ))}
                        <td className="p-4 text-right">{p.goalHours ?? '-'} h</td>
                        <td className="p-4 text-right tabular-nums">{total} h</td>
                        <td className="p-4 text-center">
                          {p.goalHours != null ? (
                            total >= (p.goalHours || 0) ? (
                              <Badge variant="default" className="h-5 min-w-5 rounded-full bg-blue-300">
                                O
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="h-5 min-w-5 rounded-full bg-red-300">
                                X
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline" className="h-5 min-w-5 rounded-full">
                              -
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">운영진은 매주 일요일 목표 달성 여부를 확인합니다.</p>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <p> 이 프로젝트의 목적은 목표를 공유하고 서로 체크하며 동기부여를 얻는 것입니다.</p>
          <p>규칙에 너무 얽매이지 말고 좋은 계기로 삼아주세요.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleResetAll} disabled={!isAdmin || loading}>
          <RefreshCw className="size-4" />
          초기화
        </Button>
      </div>
      <div className="flex flex-col items-center my-8">
        <h2 className="font-bold text-4xl text-gray-400">"</h2>
        <blockquote className="text-center text-lg italic text-indigo-700 font-serif max-w-xl" style={{ fontFamily: 'Georgia, Times, serif' }}>
          첫 번째 원칙은 자신을 속여서는 안 되며, 자신을 속이기 가장 쉬운 사람은 바로 자신이다.
        </blockquote>
        <h2 className="font-bold text-4xl text-gray-400 mt-2">"</h2>
        <h3 className="mt-2 text-base text-gray-500 font-medium" style={{ fontFamily: 'Georgia, Times, serif' }}>
          – Richard Feynman
        </h3>
      </div>
    </div>
  );
}
