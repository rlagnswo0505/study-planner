import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudyApp from '../components/StudyApp';
import StatsPage from '../pages/StatsPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudyApp />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
