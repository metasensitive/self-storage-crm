import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';

export function AppLayout() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
