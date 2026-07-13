import { Outlet } from 'react-router-dom';

import { ContentArea } from './content-area';
import { SideNav } from './sidenav';
import { TopBar } from './topbar';

export function AppLayout(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <TopBar />
      <div className="flex flex-1">
        <SideNav />
        <ContentArea>
          <Outlet />
        </ContentArea>
      </div>
    </div>
  );
}
