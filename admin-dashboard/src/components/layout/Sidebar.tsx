import React from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  UserCheck,
  LogOut, 
  X,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { title: "Dashboard", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
    { title: "User Management", icon: <Users size={20} />, href: "/users" },
    { title: "Course Catalog", icon: <BookOpen size={20} />, href: "/courses" },
    { title: "Enrollments", icon: <UserCheck size={20} />, href: "/enrollments" },
  ];

  return (
    <>
      {/* Sidebar Overlay (Mobile Only) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 w-64 h-screen transition-all duration-300 ease-in-out bg-white border-r border-slate-200 lg:translate-x-0 shadow-lg lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                    <BookOpen size={18} className="text-white" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">E-Somesha</h1>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsOpen(false)}>
                <X size={20} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-8">
            {/* Primary Nav */}
            <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
                {navItems.map((item) => (
                <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group",
                    location.pathname === item.href 
                        ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                >
                    <span className={cn(
                    "mr-3 transition-colors",
                    location.pathname === item.href ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                    )}>
                    {item.icon}
                    </span>
                    {item.title}
                </Link>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Management</p>
                <Link to="/courses" className="flex items-center px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-all">
                    <PlusCircle size={18} className="mr-3 text-slate-400" />
                    New Course
                </Link>
            </div>
          </div>

          {/* User Section */}
          <div className="p-4 border-t bg-slate-50/50">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white shadow-sm flex items-center justify-center text-white text-sm font-bold">
                {(user?.name || user?.username)?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.name || user?.username || 'Admin'}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{user?.role || 'Staff'}</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-center bg-white border-slate-200 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all text-xs font-semibold"
              onClick={logout}
            >
              <LogOut size={14} className="mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
