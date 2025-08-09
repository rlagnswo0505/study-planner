import StudyDataTable from '@/components/StudyDataTable';
import { sampleData } from '@/sample-data';

export default function StudyGoalPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">스터디 목표/실적 현황</h1>
      <StudyDataTable data={sampleData} />
    </div>
  );
}
