import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface Course {
  id: number;
  title: string;
  code: string;
  description: string;
  lecturer_id: number;
  created_at: string;
  updated_at: string;
}

export const useCourses = () => {
  const queryClient = useQueryClient();

  const coursesQuery = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data } = await api.get<Course[]>('/admin/courses');
      return data;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async (newCourse: Partial<Course>) => {
      const { data } = await api.post<Course>('/admin/courses', newCourse);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Course> & { id: number }) => {
      const { data: updatedData } = await api.put<Course>(`/admin/courses/${id}`, data);
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  return {
    courses: coursesQuery.data ?? [],
    isLoading: coursesQuery.isLoading,
    error: coursesQuery.error,
    createCourse: createCourseMutation.mutateAsync,
    updateCourse: updateCourseMutation.mutateAsync,
    deleteCourse: deleteCourseMutation.mutateAsync,
  };
};

export const useEnrollment = () => {
  const queryClient = useQueryClient();

  const enrollMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: number; courseId: number }) => {
      await api.post('/admin/enrollments', { user_id: userId, course_id: courseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      // We don't have a specific enrolled users query yet, but this clears related ones
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: number; courseId: number }) => {
      await api.delete(`/admin/courses/${courseId}/enrollments/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
    },
  });

  return {
    enroll: enrollMutation.mutateAsync,
    unenroll: unenrollMutation.mutateAsync,
    isEnrolling: enrollMutation.isPending,
    isUnenrolling: unenrollMutation.isPending,
  };
};
