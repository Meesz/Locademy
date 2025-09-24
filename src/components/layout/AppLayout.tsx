import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";
import { AppTopBar } from "./AppTopBar";

export function AppLayout() {
  return (
    <div className="flex h-screen min-h-0 w-full bg-slate-950 text-slate-100">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppTopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
