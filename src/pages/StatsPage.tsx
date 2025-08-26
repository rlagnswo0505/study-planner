import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WeekPicker } from '@/components/WeekPicker';
import { useState, useEffect, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { supabase } from '../lib/supabaseClient';
import type { Participant } from '../lib/types';
import type { ColDef, ValueGetterParams, CellValueChangedEvent, ICellRendererParams, RowStyle } from 'ag-grid-community';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { Button } from '@/components/ui/button';
import { House, Save, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

ModuleRegistry.registerModules([AllCommunityModule]);

const weekKeyFromDate = (date: Date) => {
  const year = date.getFullYear();
  const first = new Date(year, 0, 1);
  const monOffset = (first.getDay() + 6) % 7;
  const days = Math.floor((date.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  const week = Math.floor((monOffset + days) / 7) + 1;
  return `${year}-W${String(week).padStart(2, '0')}`;
};

// 삭제 버튼 셀 렌더러
const DeleteButtonCellRenderer = (props: ICellRendererParams) => {
  const handleDelete = async () => {
    if (window.confirm(`${props.data?.name} 님의 데이터를 삭제하시겠습니까?`)) {
      try {
        const { error } = await supabase.from('participants').delete().eq('id', props.data?.id).eq('weekKey', props.data?.weekKey);

        if (error) {
          console.error('Delete error:', error);
          alert('삭제 중 오류가 발생했습니다.');
          return;
        }

        alert('삭제되었습니다.');
        // 부모 컴포넌트의 데이터 새로고침을 위해 props를 통해 콜백 호출
        if (props.context?.refreshData) {
          props.context.refreshData();
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDelete} className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50">
      <Trash2 className="h-4 w-4" />
    </Button>
  );
};

const StatsPage = () => {
  const navigate = useNavigate();

  // const [selectedWeek, setSelectedWeek] = useState<{ start: Date; end: Date } | null>(null);
  const [weekKey, setWeekKey] = useState<string>(weekKeyFromDate(new Date()));

  // weekKey 및 요일 필드가 포함된 확장 타입 (DB에서 weekKey 필드 존재 가정)
  type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  interface ParticipantRow extends Participant {
    id: string; // Participant의 id가 string이라고 가정
    weekKey: string;
    mon?: number;
    tue?: number;
    wed?: number;
    thu?: number;
    fri?: number;
    sat?: number;
    sun?: number;
    dailyHours?: number[];
  }

  const [rowData, setRowData] = useState<ParticipantRow[]>([]);
  const [editedRows, setEditedRows] = useState<ParticipantRow[]>([]);
  // 변경된 행 id 집합 (저장 최적화)
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  const colDefs: ColDef<ParticipantRow>[] = [
    { field: 'name' as keyof Participant, headerName: '닉네임', editable: false, width: 100 },

    { field: 'mon' as keyof Participant, headerName: '월', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'tue' as keyof Participant, headerName: '화', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'wed' as keyof Participant, headerName: '수', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'thu' as keyof Participant, headerName: '목', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'fri' as keyof Participant, headerName: '금', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'sat' as keyof Participant, headerName: '토', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'sun' as keyof Participant, headerName: '일', editable: true, width: 60, cellStyle: { textAlign: 'center' } },
    { field: 'goalHours' as keyof Participant, headerName: '목표시간', editable: false, width: 90, cellStyle: { textAlign: 'center' } },
    {
      field: 'studiedHours' as keyof ParticipantRow,
      headerName: '공부시간',
      editable: false,
      width: 90,
      valueGetter: (params: ValueGetterParams) => {
        const dKeys: (keyof ParticipantRow)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        return dKeys.reduce((sum, k) => sum + Number(params.data?.[k] || 0), 0);
      },
      cellStyle: { textAlign: 'center' },
    },
    {
      headerName: '삭제',
      width: 80,
      editable: false,
      cellRenderer: DeleteButtonCellRenderer,
      cellStyle: { textAlign: 'center' },
      sortable: false,
      filter: false,
    },
  ];

  const [loading, setLoading] = useState(false);

  // WeekPicker에서 주차 변경 시 weekKey 갱신
  const handleWeekChange = useCallback((startDate: Date) => {
    // setSelectedWeek({ start: startDate, end: endDate });
    setWeekKey(weekKeyFromDate(startDate));
  }, []);

  // get RowData
  const getRowData = useCallback(() => {
    setLoading(true);
    supabase
      .from('participants')
      .select('*')
      .eq('weekKey', weekKey)
      .then(({ data, error }) => {
        if (error) return;
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
        const processed: ParticipantRow[] = (Array.isArray(data) ? data : []).map((row) => {
          const base = row as unknown as ParticipantRow;
          if (Array.isArray(base.dailyHours) && base.dailyHours.length === 7) {
            days.forEach((day, idx) => {
              (base as Record<DayKey, number>)[day as DayKey] = base.dailyHours![idx];
            });
          } else {
            base.dailyHours = days.map(() => 0);
            days.forEach((day) => {
              (base as Record<DayKey, number>)[day as DayKey] = 0;
            });
          }
          return base;
        });
        setRowData(processed);
        setEditedRows(processed);
        setDirtyIds(new Set());
      })
      .then(() => setLoading(false));
  }, [weekKey]);

  // 주차 변경 시 데이터 로드
  useEffect(() => {
    getRowData();
  }, [getRowData]);

  // 셀 수정 시 supabase update
  const onCellValueChanged = useCallback((params: CellValueChangedEvent) => {
    const updated = params.data as ParticipantRow;
    const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    updated.dailyHours = days.map((d) => Number(updated[d] || 0));
    setEditedRows((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    setDirtyIds((prev) => new Set(prev).add(updated.id));
  }, []);

  // 행 스타일 함수
  const getRowStyle = useCallback((params: { data?: ParticipantRow }) => {
    if (!params.data) return undefined;

    const data = params.data;
    const dKeys: (keyof ParticipantRow)[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const studiedHours = dKeys.reduce((sum, k) => sum + Number(data[k] || 0), 0);
    const goalHours = data.goalHours || 0;

    if (studiedHours >= goalHours) {
      // 목표시간 달성 - 녹색 배경 (투명도 있음)
      return { backgroundColor: 'rgba(34, 197, 94, 0.1)' }; // green-500 with 10% opacity
    } else {
      // 목표시간 미달성 - 빨간색 배경 (투명도 있음)
      return { backgroundColor: 'rgba(239, 68, 68, 0.1)' }; // red-500 with 10% opacity
    }
  }, []);

  // 저장 버튼 클릭 시
  const handleSave = async () => {
    if (!dirtyIds.size) {
      alert('변경된 내용이 없습니다.');
      return;
    }
    setLoading(true);
    try {
      const days: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      // 변경된 행만 필터링
      const toUpdate = editedRows.filter((r) => dirtyIds.has(r.id));
      for (const row of toUpdate) {
        // 저장 직전에 dailyHours 재계산 (안전)
        const daily = days.map((d) => Number(row[d] || 0));
        const payload = {
          name: row.name,
          goalHours: row.goalHours,
          dailyHours: daily,
          weekKey: row.weekKey,
        };

        console.log('Saving participant data:', payload);

        await supabase.from('participants').update(payload).eq('id', row.id).eq('weekKey', weekKey);
      }
      alert('저장되었습니다!');
      getRowData();
    } catch {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="mx-auto space-y-6">
      <Button onClick={() => navigate('/')}>
        <House />
        홈으로
      </Button>
      <div className="text-center">
        <h1 className="text-3xl font-bold">통계페이지</h1>
        <p className="text-muted-foreground mt-2">주 단위로 데이터를 조회/수정할 수 있습니다.</p>
      </div>
      <WeekPicker onWeekChange={handleWeekChange} />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>참여자 데이터 (AG Grid)</CardTitle>
            <CardDescription>셀을 직접 수정하면 DB에 반영됩니다.</CardDescription>
          </div>
          <Button disabled={loading} className="bg-[#838de5] hover:bg-[#6f7dff]" onClick={handleSave}>
            <Save />
            저장
          </Button>
        </CardHeader>
        <CardContent>
          <div className="ag-theme-alpine" style={{ height: 400, width: '100%' }}>
            <AgGridReact rowData={rowData} columnDefs={colDefs} onCellValueChanged={onCellValueChanged} animateRows={true} defaultColDef={{ editable: true, resizable: true }} loadingOverlayComponentParams={{ loadingMessage: '로딩 중...' }} singleClickEdit={true} context={{ refreshData: getRowData }} getRowStyle={getRowStyle} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsPage;
