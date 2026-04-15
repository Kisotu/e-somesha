import { api } from "./api";
import { Course, Quiz } from "../types";

export const courseService = {
  async getCourses(): Promise<Course[]> {
    const { data } = await api.get<Course[]>("/courses");
    return data;
  },

  async getCourseQuizzes(courseId: number): Promise<Quiz[]> {
    const { data } = await api.get<Quiz[]>(`/courses/${courseId}/quizzes`);
    return data;
  },
};
