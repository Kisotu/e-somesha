import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  BookOpen, 
  Users,
  Eye,
  Settings
} from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { TableSkeleton } from '../../components/shared/SkeletonLoader';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const CourseList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await api.get('/courses');
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted successfully');
    }
  });

  const filteredCourses = courses?.filter((c: any) => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Course Management</h1>
          <p className="text-sm text-slate-500">View and manage all available courses on the platform.</p>
        </div>
        <Button className="bg-slate-900 hover:bg-slate-800 shadow-md">
          <Plus className="mr-2 h-4 w-4" /> Create Course
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search courses..." 
              className="pl-10 bg-white border-slate-200 focus:ring-slate-900 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[300px]">Course Info</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses?.map((course: any) => (
              <TableRow key={course.id} className="hover:bg-slate-50/50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{course.title}</p>
                      <p className="text-xs text-slate-500 truncate">{course.description}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium px-2 py-0.5">
                    General
                  </Badge>
                </TableCell>
                <TableCell>
                   <div className="flex items-center text-slate-600 text-sm">
                      <Users size={14} className="mr-1.5 text-slate-400" />
                      0
                   </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2.5 py-1">
                    Published
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
                        <MoreVertical size={16} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-200">
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}`} className="flex items-center">
                          <Eye size={14} className="mr-2" /> View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}/edit`} className="flex items-center">
                          <Edit size={14} className="mr-2" /> Edit Course
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}/quizzes`} className="flex items-center">
                          <Settings size={14} className="mr-2" /> Manage Quizzes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this course?')) {
                            deleteMutation.mutate(course.id);
                          }
                        }}
                      >
                        <Trash2 size={14} className="mr-2" /> Delete Course
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {filteredCourses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400">
                  No courses found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CourseList;
