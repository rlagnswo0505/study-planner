import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarDays, Coffee, Gamepad2, RefreshCw, Trophy } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { GiftRecord, Participant } from '../lib/types';
import WheelSpinner from './games/WheelSpinner';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Table } from './ui/table';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
// dayjs 설치 필요: npm install dayjs @types/dayjs
import dayjs from 'dayjs';

const HOUR_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5); // 5..50
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

function isSunday(date: Date = new Date()) {
  return dayjs(date).day() === 0;
}

// Sunday-based week key for auto-reset
function thisWeekKey(d: Date = new Date()) {
  const date = dayjs(d);
  const year = date.year();
  const start = dayjs(new Date(year, 0, 1));
  const days = date.diff(start, 'day');
  const week = Math.floor((days + start.day()) / 7) + 1;
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
  const [participants, setParticipants] = useLocalStorage<Participant[]>('study-participants', []);
  const [gifts, setGifts] = useLocalStorage<GiftRecord[]>('study-gifts', []);
  const [storedWeek, setStoredWeek] = useLocalStorage<string | null>('study-week-key', null);

  const weekKey = useMemo(() => thisWeekKey(), []);
  const sunday = true; // isSunday()
  const weekLabel = koreanWeekOfMonthLabel();

  // Upgrade old records to include dailyHours
  useEffect(() => {
    setParticipants((prev) => prev.map((p) => (p.dailyHours && p.dailyHours.length === 7 ? p : { ...p, dailyHours: [0, 0, 0, 0, 0, 0, 0] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Weekly auto-reset
  useEffect(() => {
    if (!storedWeek) {
      setStoredWeek(weekKey);
      return;
    }
    if (storedWeek !== weekKey) {
      setParticipants([]);
      setGifts([]);
      setStoredWeek(weekKey);
      // simple browser toast
      try {
        // eslint-disable-next-line no-alert
        console.info('새로운 주간이 시작되어 데이터가 초기화되었습니다.');
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey]);

  // Form states
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>('');

  const [logName, setLogName] = useState('');
  const [logHours, setLogHours] = useState<number | ''>('');
  const [logComment, setLogComment] = useState('');

  const achieved = useMemo(
    () =>
      participants.map((p) => {
        const total = sumHours(p);
        return {
          ...p,
          studiedHours: total,
          achieved: p.goalHours != null && total >= p.goalHours,
        };
      }),
    [participants]
  );
  const achievers = achieved.filter((p) => p.achieved);
  const nonAchievers = achieved.filter((p) => !p.achieved);

  function ensureDaily(p?: Participant) {
    return p?.dailyHours && p.dailyHours.length === 7 ? p.dailyHours : [0, 0, 0, 0, 0, 0, 0];
  }

  function upsertParticipant(p: Participant) {
    setParticipants((prev) => {
      const idx = prev.findIndex((x) => x.name.trim() === p.name.trim());
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...p, dailyHours: ensureDaily(prev[idx]) };
        return next;
      }
      return [...prev, { ...p, dailyHours: ensureDaily(p) }];
    });
  }

  function handleVote() {
    const trimmed = name.trim();
    if (!trimmed || !goal) {
      alert('닉네임과 목표 시간을 입력해 주세요.');
      return;
    }
    const existing = participants.find((p) => p.name === trimmed);
    upsertParticipant({
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

  function handleLog() {
    const trimmed = logName.trim();
    const who = participants.find((p) => p.name.trim() === trimmed);
    if (!who) {
      alert('먼저 일요일에 목표를 등록해 주세요.');
      return;
    }
    const hours = typeof logHours === 'number' ? logHours : parseInt(String(logHours || 0), 10);
    if (!hours || hours <= 0) {
      alert('공부한 시간을 올바르게 입력해 주세요.');
      return;
    }
    const dayIdx = todayMonIndex();
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.name.trim() !== trimmed) return p;
        const daily = ensureDaily(p).slice();
        daily[dayIdx] = (daily[dayIdx] || 0) + hours;
        const total = daily.reduce((a, b) => a + b, 0);
        return {
          ...p,
          dailyHours: daily,
          studiedHours: total,
          comments: logComment ? [...p.comments, logComment] : p.comments,
        };
      })
    );
    setLogHours('');
    setLogComment('');
  }

  function handleResetAll() {
    setParticipants([]);
    setGifts([]);
    setStoredWeek(weekKey);
  }

  function recordGift(fromName: string, toName: string) {
    const rec: GiftRecord = {
      id: crypto.randomUUID(),
      weekKey,
      from: fromName,
      to: toName,
      createdAt: new Date().toISOString(),
    };
    setGifts((prev) => [rec, ...prev]);
  }

  const hourItems = HOUR_OPTIONS.map((h) => (
    <SelectItem key={h} value={String(h)}>
      {h}시간
    </SelectItem>
  ));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted p-2">
            <BookOpenText className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">매주 목표달성</h1>
            <p className="text-sm text-muted-foreground">함께 목표를 공유하고 체크하며 동기부여를 얻어요.</p>
          </div>
        </div>
        <Badge variant={'outline'} className="py-2 rounded-full">
          <CalendarDays className="size-4 text-amber-600" />
          <span className="whitespace-nowrap">{weekLabel}</span>
        </Badge>
      </header>

      {!sunday && (
        <Alert className="mb-2">
          <AlertTitle>투표는 일요일 하루만 가능합니다</AlertTitle>
          <AlertDescription>오늘은 일요일이 아니므로 목표 등록/변경이 비활성화됩니다.</AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>목표 시간 투표 (일요일 한정)</CardTitle>
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
              <Select value={goal} onValueChange={(v) => setGoal(v ? v : '')} disabled={!sunday}>
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
              <Button className="w-full bg-[#838de5] hover:bg-[#6f7dff]" onClick={handleVote} disabled={!sunday}>
                목표 등록
              </Button>
            </div>
            <p className="sm:col-span-3 text-xs text-muted-foreground">오프라인 스터디 시간만 인정됩니다. 1인 스터디의 경우 타임스탬프 등으로 인증해 주세요.</p>
          </div>
        </CardContent>
      </Card>

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
              <Input
                id="log-hours"
                className="mt-1"
                inputMode="numeric"
                placeholder="시간"
                value={logHours}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') setLogHours('');
                  else setLogHours(Number(v));
                }}
              />
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
          <Table className="bg-white rounded-lg">
            <thead className="border-b">
              <tr className="hover:bg-muted/50 transition-colors">
                <th className="whitespace-nowrap">닉네임</th>
                {DAY_LABELS.map((d) => (
                  <th key={d} className={`text-center p-4 whitespace-nowrap ${d === '토' ? 'text-blue-400' : d === '일' ? 'text-red-400' : ''}`}>
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
                        <td key={i} className="p-4 text-center tabular-nums">
                          {h || 0}
                        </td>
                      ))}
                      <td className="p-4 text-right">{p.goalHours ?? '-'}시간</td>
                      <td className="p-4 text-right tabular-nums">{total}시간</td>
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
          <p className="mt-3 text-xs text-muted-foreground">운영진은 매주 일요일 목표 달성 여부를 확인합니다.</p>
        </CardContent>
      </Card>

      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gamepad2 className="size-5" />
            <div>
              <CardTitle>벌칙 게임: 선물 받을 사람 뽑기</CardTitle>
              <CardDescription>미달성자가 정해지면 달성자들 중 랜덤으로 1명을 뽑아 선물을 보냅니다.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {nonAchievers.length === 0 || achievers.length === 0 ? (
            <Alert className="mb-2">
              <AlertTitle>참여 조건을 확인하세요</AlertTitle>
              <AlertDescription>
                미달성자 {nonAchievers.length}명 / 달성자 {achievers.length}명. 둘 다 1명 이상일 때 진행할 수 있어요.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <GiftGame achievers={achievers} nonAchievers={nonAchievers} onGift={(from, to) => recordGift(from, to)} />
              <div className="separator" />
              <div>
                <h4 className="mb-2 text-sm font-medium">선물 기록</h4>
                {gifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">아직 선물 기록이 없습니다.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {gifts.map((g) => (
                      <li key={g.id} className="flex items-center justify-between">
                        <span>
                          {g.weekKey} · {g.from} ➜ {g.to}
                        </span>
                        <span className="text-muted-foreground">{new Date(g.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <p> 이 프로젝트의 목적은 목표를 공유하고 서로 체크하며 동기부여를 얻는 것입니다.</p>
          <p>규칙에 너무 얽매이지 말고 좋은 계기로 삼아주세요.</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleResetAll}>
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

function GiftGame({ achievers, nonAchievers, onGift }: { achievers: Participant[]; nonAchievers: Participant[]; onGift: (from: string, to: string) => void }) {
  const [from, setFrom] = useState(nonAchievers[0]?.name ?? '');
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!nonAchievers.find((n) => n.name === from)) {
      setFrom(nonAchievers[0]?.name ?? '');
    }
  }, [nonAchievers, from]);

  const achieverNames = achievers.map((a) => a.name);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <Label htmlFor="from">미달성자</Label>
          <select id="from" className="select mt-1" value={from} onChange={(e) => setFrom(e.target.value)}>
            {nonAchievers.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <div className="text-sm text-muted-foreground">달성자: {achieverNames.join(', ') || '-'}</div>
        </div>
      </div>

      <div>
        <WheelSpinner
          options={achieverNames}
          onDone={(winner) => {
            setPicked(winner);
            if (from) onGift(from, winner);
          }}
        />
      </div>

      {picked && (
        <div className="alert">
          <div className="font-medium">결과</div>
          <div>
            {from} ➜ {picked} 님께 선물!
          </div>
        </div>
      )}
    </div>
  );
}
