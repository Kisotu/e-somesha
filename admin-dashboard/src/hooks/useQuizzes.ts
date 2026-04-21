import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import type { Quiz, Question } from '@/types';

export function useQuizzes(courseId?: number) {
  const queryClient = useQueryClient();

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ['admin-quizzes', courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data } = await api.get(`/courses/${courseId}/quizzes`);
      return data;
    },
    enabled: !!courseId,
  });

  const createQuiz = useMutation({
    mutationFn: async (newQuiz: Partial<Quiz>) => {
      const { data } = await api.post(`/admin/courses/${courseId}/quizzes`, newQuiz);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes', courseId] });
    },
  });

  const updateQuiz = useMutation({
    mutationFn: async (updatedQuiz: Partial<Quiz>) => {
      const { data } = await api.put(`/admin/quizzes/${updatedQuiz.id}`, updatedQuiz);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes', courseId] });
    },
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/quizzes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quizzes', courseId] });
    },
  });

  return {
    quizzes,
    isLoading,
    createQuiz: createQuiz.mutateAsync,
    updateQuiz: updateQuiz.mutateAsync,
    deleteQuiz: deleteQuiz.mutateAsync,
  };
}

export function useQuestions(quizId?: number) {
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ['admin-questions', quizId],
    queryFn: async () => {
      if (!quizId) return [];
      const { data } = await api.get(`/quizzes/${quizId}/questions`); // Need to ensure this path exists in backend
      return data;
    },
    enabled: !!quizId,
  });

  const createQuestion = useMutation({
    mutationFn: async (newQuestion: Partial<Question>) => {
      const { data } = await api.post(`/admin/quizzes/${quizId}/questions`, newQuestion);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', quizId] });
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async (updatedQuestion: Partial<Question>) => {
      const { data } = await api.put(`/admin/questions/${updatedQuestion.id}`, updatedQuestion);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', quizId] });
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/questions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-questions', quizId] });
    },
  });

  return {
    questions,
    isLoading,
    createQuestion: createQuestion.mutateAsync,
    updateQuestion: updateQuestion.mutateAsync,
    deleteQuestion: deleteQuestion.mutateAsync,
  };
}
