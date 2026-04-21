import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface Announcement {
  id: number;
  course_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const useAnnouncements = (courseId: number) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-announcements', courseId],
    queryFn: async () => {
      const { data } = await api.get<Announcement[]>(`/protected/courses/${courseId}/announcements`);
      return data;
    },
    enabled: !!courseId,
  });

  const createMutation = useMutation({
    mutationFn: async (newAnnouncement: Partial<Announcement>) => {
      const { data } = await api.post<Announcement>(`/admin/courses/${courseId}/announcements`, newAnnouncement);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements', courseId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Announcement> & { id: number }) => {
      const { data: updatedData } = await api.put<Announcement>(`/admin/announcements/${id}`, data);
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements', courseId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements', courseId] });
    },
  });

  return {
    announcements: query.data ?? [],
    isLoading: query.isLoading,
    createAnnouncement: createMutation.mutateAsync,
    updateAnnouncement: updateMutation.mutateAsync,
    deleteAnnouncement: deleteMutation.mutateAsync,
  };
};
