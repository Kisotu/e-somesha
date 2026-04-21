import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  ArrowLeft, 
  BookOpen, 
  FileText, 
  Video, 
  Layers, 
  Settings,
  MoreVertical,
  ChevronRight,
  Clock,
  User,
  Plus
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { TableSkeleton } from '../../components/shared/SkeletonLoader';

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data } = await api.get(`/courses/${id}`);
      return data;
    }
  });

  if (isLoading) return <TableSkeleton />;
  if (!course) return <div>Course not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Breadcrumbs */}
      <nav className="flex items-center text-sm text-slate-500 gap-2">
        <Link to="/courses" className="hover:text-slate-900 transition-colors">Courses</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium truncate max-w-[200px]">{course.title}</span>
      </nav>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
         <div className="h-48 bg-slate-900 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
            <div className="absolute bottom-6 left-8 flex items-end gap-6 text-white">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                    <BookOpen size={32} />
                </div>
                <div className="flex-1 pb-2">
                   <h1 className="text-3xl font-bold">{course.title}</h1>
                   <p className="text-slate-300 flex items-center gap-2 text-sm mt-1">
                      <Clock size={14} /> Updated 2 days ago • <User size={14} /> Admin
                   </p>
                </div>
            </div>
            <div className="absolute top-6 right-8 flex gap-2">
               <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md" asChild>
                  <Link to={`/courses/${id}/edit`}>Edit Course</Link>
               </Button>
               <Button size="icon" variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md">
                 <Settings size={18} />
               </Button>
            </div>
         </div>

         <div className="p-8 grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
                <section>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Course Description</h2>
                    <p className="text-slate-600 leading-relaxed">{course.description}</p>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900">Quizzes</h2>
                        <Button size="sm" variant="outline" asChild>
                           <Link to={`/courses/${id}/quizzes`}>
                              <Plus size={14} className="mr-1" /> New Quiz
                           </Link>
                        </Button>
                    </div>
                    {(course.quizzes?.length || 0) > 0 ? (
                       <div className="grid gap-3">
                          {course.quizzes.map((q: any) => (
                             <Link 
                               key={q.id} 
                               to={`/courses/${id}/quizzes/${q.id}`}
                               className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group"
                             >
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                                      <Layers size={18} />
                                   </div>
                                   <div>
                                      <p className="text-sm font-bold text-slate-900">{q.title}</p>
                                      <p className="text-xs text-slate-500">{q.questions?.length || 0} Questions</p>
                                   </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                             </Link>
                          ))}
                       </div>
                    ) : (
                       <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                          <Layers size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-slate-500 text-sm">No quizzes have been added yet.</p>
                       </div>
                    )}
                </section>
            </div>

            <div className="space-y-6">
               <Card className="border-slate-200 shadow-sm rounded-2xl">
                  <CardHeader className="pb-3 border-b border-slate-100 mb-4">
                     <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400">Course Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Students</span>
                        <span className="text-sm font-bold text-slate-900">0</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Materials</span>
                        <span className="text-sm font-bold text-slate-900">0</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">Completion Rate</span>
                        <span className="text-sm font-bold text-slate-900">0%</span>
                     </div>
                  </CardContent>
               </Card>

               <Card className="border-slate-200 shadow-sm rounded-2xl bg-slate-900 text-white border-none">
                  <CardContent className="p-6 space-y-4">
                     <p className="text-sm font-medium text-slate-300">Visibility Status</p>
                     <div className="flex items-center justify-between">
                        <Badge className="bg-emerald-500 text-white border-none px-3 py-1 font-bold">Published</Badge>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">Change</Button>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>
      </div>
    </div>
  );
};

export default CourseDetail;
