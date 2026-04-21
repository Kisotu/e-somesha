import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin' | 'administrator';
  created_at: string;
}

export const useUsers = (filters: { role?: string; page?: number; limit?: number } = {}) => {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const { data } = await api.get<{ users: User[]; total: number }>('/admin/users', { params: filters });
      return data;
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return {
    users: usersQuery.data?.users ?? [],
    total: usersQuery.data?.total ?? 0,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error,
    deleteUser: deleteUserMutation.mutateAsync,
  };
};

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['admin-all-users-list'],
    queryFn: async () => {
      // Fetch a larger batch for dropdowns/selection
      const { data } = await api.get<{ users: User[] }>('/admin/users', { params: { limit: 1000 } });
      return data.users;
    },
  });
};
