import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { TweaksPanel } from '@/components/TweaksPanel';

export function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
      <TweaksPanel />
    </div>
  );
}
