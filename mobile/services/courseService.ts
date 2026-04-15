import { api } from "./api";
import {
  Course,
  DownloadManifestResponse,
  Material,
  Quiz,
  QuizAttemptSyncPayload,
  QuizDetailResponse,
} from "../types";

export const courseService = {
  async getCourses(): Promise<Course[]> {
    const { data } = await api.get<Course[]>("/courses");
    return data;
  },

  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const { data } = await api.get<Quiz[]>(`/courses/${courseId}/quizzes`);
    return data;
  },

  async getCourseMaterials(courseId: number): Promise<Material[]> {
    const { data } = await api.get<Material[]>(`/courses/${courseId}/materials`);
    return data;
  },

  async getQuiz(quizId: number): Promise<QuizDetailResponse> {
    const { data } = await api.get<QuizDetailResponse>(`/quizzes/${quizId}`);
    return data;
  },

  async getDownloadManifest(courseId: number): Promise<DownloadManifestResponse> {
    const { data } = await api.get<DownloadManifestResponse>(`/courses/${courseId}/download_manifest`);
    return data;
  },

  async syncQuizAttempts(attempts: QuizAttemptSyncPayload[]): Promise<void> {
    await api.post("/sync/quiz_attempts", { attempts });
  },
};
