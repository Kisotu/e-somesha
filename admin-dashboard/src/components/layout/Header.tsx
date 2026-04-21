import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Search, 
  Menu, 
  User,
  Settings,
  HelpCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../../context/AuthContext";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "../ui/dropdown-menu";
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ['global-search', search],
    queryFn: async () => {
      if (!search || search.length < 2) return null;
      // We'll mock a multi-endpoint search or a specialized search endpoint
      const [courses, users] = await Promise.all([
        api.get('/courses'),
        api.get('/admin/users')
      ]);
      
      return {
        courses: (courses.data || []).filter((c: any) => c.title.toLowerCase().includes(search.toLowerCase())).slice(0, 3),
        users: (users.data || []).filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase())).slice(0, 3)
      };
    },
    enabled: search.length >= 2
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b bg-white/80 backdrop-blur-md sticky top-0 z-30 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu size={20} />
        </Button>
        
        {/* Global Search */}
        <div ref={searchRef} className="relative hidden md:flex items-center w-full max-w-md group">
          <Search 
            size={18} 
            className={`absolute left-3 transition-colors ${isSearchFocused ? 'text-slate-900' : 'text-slate-400'}`} 
          />
          <Input 
            placeholder="Search for courses, students, or resources..." 
            className="pl-10 h-10 bg-slate-100 border-none focus:bg-white focus:ring-1 focus:ring-slate-200 transition-all rounded-xl w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
          />

          {/* Search Dropdown */}
          {isSearchFocused && search.length >= 2 && (
            <div className="absolute top-12 left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                   <Clock size={16} className="animate-spin" /> Searching...
                </div>
              ) : (
                <div className="space-y-4 p-2">
                  {searchResults?.courses.length > 0 && (
                    <div>
                      <p className="px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Courses</p>
                      {searchResults?.courses?.map((c: any) => (
                        <Link 
                          key={c.id} 
                          to={`/courses/${c.id}`} 
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                          onClick={() => setIsSearchFocused(false)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                             <BookOpen size={16} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{c.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {searchResults?.users.length > 0 && (
                    <div>
                      <p className="px-2 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Users</p>
                      {searchResults?.users?.map((u: any) => (
                        <Link 
                          key={u.id} 
                          to={`/users`} 
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                          onClick={() => setIsSearchFocused(false)}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">
                             {u.name[0]}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{u.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {(!searchResults?.courses.length && !searchResults?.users.length) && (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No results found for "{search}"
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-900 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-slate-50 rounded-xl transition-all">
              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm">
                {(user?.name || user?.username)?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.name || user?.username || 'Admin'}</p>
                <p className="text-[10px] text-slate-500 mt-1 capitalize">{user?.role || 'Staff'}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-2xl p-2 border-slate-200">
            <DropdownMenuLabel className="text-slate-500 text-[10px] uppercase font-bold tracking-widest px-2 py-1.5">My Account</DropdownMenuLabel>
            <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-2 cursor-pointer">
              <User size={16} /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-2 cursor-pointer">
              <Settings size={16} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 border-slate-100" />
            <DropdownMenuItem className="rounded-xl flex items-center gap-3 p-2 cursor-pointer">
              <HelpCircle size={16} /> Help Center
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
