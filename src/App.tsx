import './App.css';
import AppRouter from './router/router';

function App() {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <AppRouter />
      </div>
    </main>
  );
}

export default App;
