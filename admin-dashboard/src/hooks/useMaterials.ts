import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';

export interface Material {
  id: number;
  course_id: number;
  title: string;
  type: string;
  file_url: string;
  file_size: number;
  checksum: string;
  created_at: string;
  updated_at: string;
}

export const useMaterials = (courseId: number) => {
  const queryClient = useQueryClient();

  const materialsQuery = useQuery({
    queryKey: ['admin-materials', courseId],
    queryFn: async () => {
      const { data } = await api.get<Material[]>(`/protected/courses/${courseId}/materials`);
      return data;
    },
    enabled: !!courseId,
  });

  const createMaterialMutation = useMutation({
    mutationFn: async (newMaterial: Partial<Material>) => {
      const { data } = await api.post<Material>(`/admin/courses/${courseId}/materials`, newMaterial);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials', courseId] });
    },
  });

  const updateMaterialMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Material> & { id: number }) => {
      const { data: updatedData } = await api.put<Material>(`/admin/materials/${id}`, data);
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials', courseId] });
    },
  });

  const deleteMaterialMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials', courseId] });
    },
  });

  return {
    materials: materialsQuery.data ?? [],
    isLoading: materialsQuery.isLoading,
    createMaterial: createMaterialMutation.mutateAsync,
    updateMaterial: updateMaterialMutation.mutateAsync,
    deleteMaterial: deleteMaterialMutation.mutateAsync,
  };
};
