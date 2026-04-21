import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex flex-1 flex-col transition-all duration-300 lg:pl-64">
        <Header onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
        <footer className="py-6 px-4 border-t bg-white/50 text-center text-xs text-slate-400">
           &copy; {new Date().getFullYear()} E-Somesha Learning Systems • Administrator Dashboard
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
