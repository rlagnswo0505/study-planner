import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface WeekPickerProps {
  onWeekChange?: (startDate: Date, endDate: Date) => void;
  initialDate?: Date;
  className?: string;
}

export function WeekPicker({ onWeekChange, initialDate = new Date(), className }: WeekPickerProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);

  // 주의 시작일 (월요일)과 종료일 (일요일) 계산
  const getWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // 월요일을 주의 시작으로
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return { startOfWeek, endOfWeek };
  };

  const { startOfWeek, endOfWeek } = getWeekRange(currentDate);

  // 이전 주로 이동
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);

    const { startOfWeek: newStart, endOfWeek: newEnd } = getWeekRange(newDate);
    onWeekChange?.(newStart, newEnd);
  };

  // 다음 주로 이동
  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);

    const { startOfWeek: newStart, endOfWeek: newEnd } = getWeekRange(newDate);
    onWeekChange?.(newStart, newEnd);
  };

  // 오늘이 포함된 주로 이동
  const goToCurrentWeek = () => {
    const today = new Date();
    setCurrentDate(today);

    const { startOfWeek: newStart, endOfWeek: newEnd } = getWeekRange(today);
    onWeekChange?.(newStart, newEnd);
  };

  // 날짜 포맷팅
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatYear = (date: Date) => {
    return date.getFullYear();
  };

  // 주차 계산
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />주 선택
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 네비게이션 버튼 */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="h-8 w-8 p-0 bg-transparent">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center">
            <div className="text-sm font-medium">
              {formatYear(startOfWeek)}년 {getWeekNumber(startOfWeek)}주차
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(startOfWeek)} - {formatDate(endOfWeek)}
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={goToNextWeek} className="h-8 w-8 p-0 bg-transparent">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 주간 달력 표시 */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
            <div key={day} className="text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: 7 }, (_, index) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + index);
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`
                  text-sm py-2 rounded-md transition-colors
                  ${isToday ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-muted'}
                `}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>

        {/* 오늘 주로 이동 버튼 */}
        <Button variant="secondary" size="sm" onClick={goToCurrentWeek} className="w-full">
          이번 주로 이동
        </Button>
      </CardContent>
    </Card>
  );
}
