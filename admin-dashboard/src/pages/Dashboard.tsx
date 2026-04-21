import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
  Users,
  BookOpen,
  GraduationCap,
  Layers,
  TrendingUp,
  ArrowUpRight,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area 
} from 'recharts';
import { CardSkeleton } from '../components/shared/SkeletonLoader';

const Dashboard: React.FC = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data;
    }
  });

  const chartData = [
    { name: 'Mon', count: 400 },
    { name: 'Tue', count: 300 },
    { name: 'Wed', count: 600 },
    { name: 'Thu', count: 800 },
    { name: 'Fri', count: 500 },
    { name: 'Sat', count: 900 },
    { name: 'Sun', count: 1200 },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const statCards = [
    { title: "Students", value: stats?.total_students || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Lecturers", value: stats?.total_lecturers || 0, icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Active Courses", value: stats?.total_courses || 0, icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Total Quizzes", value: stats?.total_quizzes || 0, icon: Layers, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Platform Overview</h1>
          <p className="text-slate-500 mt-1">Real-time metrics and system health monitoring.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" className="hidden sm:flex shadow-sm">Export Report</Button>
            <Button className="shadow-lg shadow-slate-200">
                <Plus className="mr-2 h-4 w-4" /> New Course
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden ring-1 ring-slate-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={c.bg + " p-3 rounded-2xl " + c.color}>
                    {React.createElement(c.icon as LucideIcon, { size: 24 })}
                </div>
                <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <TrendingUp size={12} className="mr-1" /> +12%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-500">{c.title}</p>
                <div className="flex items-baseline gap-2">
                   <h3 className="text-3xl font-bold text-slate-900 leading-none">{c.value.toLocaleString()}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 border-none shadow-sm ring-1 ring-slate-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div>
                   <CardTitle className="text-lg">Student Engagement</CardTitle>
                   <CardDescription>Daily portal activity across the platform.</CardDescription>
                </div>
                <select className="text-xs font-medium border rounded-md px-2 py-1 bg-white">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 border-none shadow-sm ring-1 ring-slate-200/50">
          <CardHeader>
            <CardTitle className="text-lg">Key Actions</CardTitle>
            <CardDescription>Common administrative tasks.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {[
               { label: "Approve Instructor Requests", desc: "4 pending verification", action: "View", color: "bg-blue-600" },
               { label: "Flagged Content", desc: "2 materials reported", action: "Review", color: "bg-red-600" },
               { label: "System Backup", desc: "Last backup 14h ago", action: "Run", color: "bg-slate-900" }
             ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs h-8">
                        {item.action} <ArrowUpRight className="ml-1 h-3 w-3" />
                    </Button>
                </div>
             ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
